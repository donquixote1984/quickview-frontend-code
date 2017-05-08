require('./Footer.scss');
const $ = require('jquery');
const template = require('./Footer.hbs');
const itemTemplate = require('./FooterItem.hbs');

const request = require('base/Request');
const LogUtils = require('base/LogUtils');
const Component = require('base/Component');

class Footer extends Component {
    name = 'Footer'; //eslint-disable-line
    pageSize = 10;//eslint-disable-line
    maxPageSize = 5;//eslint-disable-line
    _maxPageNum = 0; //eslint-disable-line
    removeDup = true;
    constructor(args) {
        super({ ...args, template });
    }

    beforeConstruct() {
        const deferred = $.Deferred();//eslint-disable-line

        let quickViewList = this.getState('quickViewList');

        /**
         * reduce the quick view list number when there is more than 50 item originally.
         * */
        if (quickViewList.length > this.pageSize * this.maxPageSize) {
            quickViewList = quickViewList.slice(0, this.pageSize * this.maxPageSize);
            this.parent.setState('quickViewList', quickViewList);
            this.setState('quickViewList', quickViewList);
        }

        /**
         * from 1 to totalPage
         * */
        this.currentPage = Math.ceil((this.getState('selectedIndex') + 1) / this.pageSize) || 1;

        this.resetNav();

        /**
         * test if only 1 page
         * */
        if (quickViewList.length < this.pageSize && !this.getState('nextPageUrl')) {
            this.setState('hasNextPage', false);
        }

        return deferred.resolve();
    }

    afterConstruct() {

        const quickViewList = this.getState('quickViewList');

        if (!$.isArray(quickViewList)) {
            return;
        }

        if (quickViewList.length === 0) {
            return;
        }


        this.initItemClick();

        this.initHoverTips();

        this.initPagination();
        /**
         *  use the selectedIndex to relocate the slider.
         * */
        this.slide(false);

        /**
         * A option to determine whether to remove duplicate footer item.
         * */
        if (this.removeDup) {
            this.requestAllProducts();
        }
    }

    slide(withAnimation) {
        const quickViewFooterList = this.container.find('.quick-view-footer-list');
        const slideWidth = this.container.find('.quick-view-footer-item').width() * 10;
        const deferred = $.Deferred(); //eslint-disable-line
        if (withAnimation) {
            quickViewFooterList.animate({
                'margin-left': -slideWidth * (this.currentPage - 1)
            }, 200, () => {
                deferred.resolve();
            });
        } else {
            quickViewFooterList.css({
                'margin-left': -slideWidth * (this.currentPage - 1)
            });
            deferred.resolve();
        }

        return deferred;
    }

    requestNextPage() {

        const deferred = $.Deferred(); //eslint-disable-line
        if (this.removeDup) {
            return deferred.resolve();
        }
        const nextPageUrl = this.getState('nextPageUrl');
        if (!nextPageUrl) {
            return deferred.resolve();
        }


        const footerContainter = this.container.find('.quick-view-footer-list');
        const quickViewList = this.getState('quickViewList');

        /**
         * if the data has already cached. just return
         * */
        if (quickViewList[this.currentPage * this.pageSize - 1]) {
            return deferred.resolve();
        }
        /**
         * otherwise if there is no data in the current page, just request new data.
         * */
        this.toggleNext(false);
        request(nextPageUrl)
            .speedChecker({key: this.getGlobalStore().getState('productId')})
            .speedCheckerRender(this.container)
            .then((data) => {
                this.setState('nextPageUrl', data.nextPageUrl);
                this.parent.setState('nextPageUrl', data.nextPageUrl);
                const appendList = data.itemList;

                /**
                 * never calculate by ur self,  let javascript/jquery calculate by itself.
                 * */

                /** if (quickViewList.length + data.itemList.length > this.pageSize * this.maxPageSize) {
                    appendList = appendList.slice(0, this.pageSize * this.maxPageSize - quickViewList.length);
                }*/
                quickViewList.push(...appendList);
                quickViewList.slice(0, this.pageSize * this.maxPageSize); /**  0 - 50 */

                appendList.forEach((item) => {
                    const html = itemTemplate(item);
                    footerContainter.append($(html));
                });

                footerContainter.find('.quick-view-footer-item').slice(this.pageSize * this.maxPageSize).remove();
                this.toggleNext(true);
                deferred.resolve();
            });
        return deferred;
    }

    initHoverTips() {
        /**
         * hover a popup
         *
         *
         * the tooltips implementation has a trick:
         *
         * if it is the last tooltip in the current list,
         * the tooltip is squeezed and become a 'square' which is ugly
         * */

        this.container.find('.quick-view-footer-list').on('mouseenter', '.quick-view-footer-item', (e) => {
            const $target = $(e.currentTarget);


            /**
             *   -width/2 makes tooltip center
             * */

            /**
             * can not just use css:hover to control visibility, because if refresh the quick view window, and the
             * cursor still stays at the footer item, the position will be screwed up
             * */
            const $tooltipsWrapper = $target.find('.quick-view-footer-item-tips-wrapper');
            const $tooltips = $tooltipsWrapper.find('.quick-view-footer-item-tips');
            const $tooltipsOverflow = $tooltips.find('.quick-view-footer-item-tips-hidden');
                /**
                 * do not use offset().left, cross browser issue.
                 * */
                const position = $target.position();
                const left = position.left;
                $tooltips.css('left', left + 38);
                $target.data('popuped', true);

                /**
                 * ellipsis
                 */

                $tooltipsWrapper.show();
                const innerSpan = $tooltips.find('.quick-view-footer-item-tips-ellipsis');

                const height = $tooltipsOverflow.innerHeight();
                if (innerSpan.outerHeight() > height) {
                    $tooltipsOverflow.addClass('overflow-ellipsis');
                }

        }).on('mouseleave', '.quick-view-footer-item', (e) => {
            $(e.currentTarget).find('.quick-view-footer-item-tips-wrapper').hide();
        });
    }

    initItemClick() {
        /**
         * add click event for each footer item.
         * */
        this.container.find('.quick-view-footer-list').on('click', '.quick-view-footer-item', (e) => {
            e.stopPropagation();
            const productId = $(e.currentTarget).data('productId');
            const quickViewDataResult = $.grep(this.state.quickViewList, (obj) => { //eslint-disable-line
                /**
                 * MUST use $.grep instead of Array.prototype.find,  ie edge does not support
                 * MUST use == , obj.optionId is a str
                 * */
                return obj.productId == productId; //eslint-disable-line
            });
            const quickViewData = quickViewDataResult[0];
            const dataIndex = $(e.currentTarget).index();

            LogUtils.click().url('/click_item_on_quick_view_pop_up_bar').param({sourceType: this.getGlobalStore().getState('sourceType')}).send();
            this.globalStore.broadcast('refresh', { ...quickViewData, selectedIndex: dataIndex, selectedProductId: productId });
        });
    }

    initPagination() {
        /**
         * init the events
         * */
        this.container.find('.quick-nav').click((e) => {

            const clickBtn = $(e.currentTarget);

            if (clickBtn.is('.quick-nav-next')) {
                this.nextPage();
            } else {
                this.prevPage();
            }
        });
    }

    checkNextPage() {
        if (!this.getState('hasNextPage')) {
            return false;
        }

        if (this.currentPage === this.maxPageSize) {
            return false;
        }
        return true;
    }

    checkPrevPage() {
        if (this.currentPage === 1) {
            return false;
        }
        return true;
    }

    nextPage() {

        this.currentPage += 1;

        if (this.currentPage > this._maxPageNum) {
            this._maxPageNum = this.currentPage;
            LogUtils.impression().url('/curernt_page_on_quick_view_pop_up').param({pageNo: this._maxPageNum, sourceType: this.getGlobalStore().getState('sourceType')}).send();
        }

        LogUtils.click().url('/click_right_button_on_quick_view_pop_up').param({sourceType: this.getGlobalStore().getState('sourceType')}).send();

        this.requestNextPage().then(() => {
            this.slide(true);
            this.resetNav();
        });
    }

    prevPage() {
        this.currentPage -= 1;
        LogUtils.click().url('/click_left_button_on_quick_view_pop_up').param({sourceType: this.getGlobalStore().getState('sourceType')}).send();
        this.slide(true);
        this.resetNav();
    }
    togglePrev(enable) {
        this.setState('hasPrevPage', enable);
        enable ? this.container.find('.quick-nav-prev').prop('disabled', false) : this.container.find('.quick-nav-prev').prop('disabled', true);
    }
    toggleNext(enable) {
        this.setState('hasNextPage', enable);
        enable ? this.container.find('.quick-nav-next').prop('disabled', false) : this.container.find('.quick-nav-next').prop('disabled', true);
    }
    resetNav() {
        /**
         * check if there is a prev btn enabled.
         * */
        if (this.currentPage > 1) {
            this.togglePrev(true);
        } else {
            this.togglePrev(false);
        }

        const totalPage = Math.ceil(this.getState('quickViewList').length / this.pageSize) || 1;
        /**
         * if quick view list already has more than one page,  then there should has next page.
         * */
        if (this.currentPage === this.maxPageSize) {
            this.toggleNext(false);
        } else if (this.currentPage < totalPage) {
            this.toggleNext(true);
        } else {
            /**
             * if current page reach the quick view list tail, then check if there is next page url.
             * */
            if (this.getState('nextPageUrl')) {
                this.toggleNext(true);
            } else {
                this.toggleNext(false);
            }
        }
    }

    requestAllProducts() {
        const quickViewList = this.getState('quickViewList');
        const footerContainter = this.container.find('.quick-view-footer-list');
        const nextPageUrl = this.getState('nextPageUrl');
        request(nextPageUrl)
            .speedChecker({key: this.getGlobalStore().getState('productId')})
            .speedCheckerRender(this.container)
            .then((data) => {
                this.setState('nextPageUrl', data.nextPageUrl);
                this.parent.setState('nextPageUrl', data.nextPageUrl);
                const appendList = data.itemList;
                const distinctAppendList = [];

                /**
                 * never calculate by ur self,  let javascript/jquery calculate by itself.
                 * */

                /** if (quickViewList.length + data.itemList.length > this.pageSize * this.maxPageSize) {
                    appendList = appendList.slice(0, this.pageSize * this.maxPageSize - quickViewList.length);
                }*/

                /**
                 * remove duplicate
                 * */
                appendList.forEach((obj) => {
                   const result = $.grep(quickViewList, _obj =>
                        _obj.productId === obj.productId
                   );
                    if (result.length === 0) {
                        quickViewList.push(obj);
                        distinctAppendList.push(obj);
                    }
                });
                /**
                 * end of removing duplicate
                 * */
                //  quickViewList.push(...appendList);
                quickViewList.slice(0, this.pageSize * this.maxPageSize); /**  0 - 50 */

                distinctAppendList.forEach((item) => {
                    const html = itemTemplate(item);
                    footerContainter.append($(html));
                });

                footerContainter.find('.quick-view-footer-item').slice(this.pageSize * this.maxPageSize).remove();

                if (nextPageUrl && quickViewList.length < this.pageSize * this.maxPageSize) {
                    this.requestAllProducts();
                }
            });
    }
}

module.exports = Footer;
