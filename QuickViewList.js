const $ = require('jquery');
const essentialData = require('../../common/essentialData');
const couLog = require('couLog');

class QuickViewList {
    constructor() {
        this.restUrl = '';
        this.productId = essentialData.getProductId() || '';
        this.vendorItemId = essentialData.getState('vendorItemId') || '';
        this.itemId = essentialData.getState('itemId') || '';
        this.invalidFlag = essentialData.getState('invalidProduct');
        this.initData();
    }
    initData() {
        this.toQuickView = false;
        if (essentialData.getClickStyle() === 'TO_QUICK_VIEW') {
            this.toQuickView = true;
        }
        this.pageList = [];
        this.count = -1;
        this.quickViewList = [];
        this.totalPage = 0;
        this.cachedQuickViewList;
        this.cachedNextPageUrl;
        this.cachedData;
        this.cachedPageList;
        this.cachedCurPage;
        this.cachedSelIndex;
        this.stopClickEvent = false;
        this.loggedPageList = [];
    }
    ensureQuickViewWindow() {
        /*  const deferred = $.Deferred(); //eslint-disable-line
        if (!this.quickViewWindow) {
            const that = this;
            __webpack_public_path__ = window.bundleUrl; //eslint-disable-line

            require.ensure(['./QuickViewWindow'], function (require) {
                const _QuickViewWindowClass = require('./QuickViewWindow');
                that.quickViewWindow = new _QuickViewWindowClass();
                that.quickViewWindow.getGlobalStore().watch('close', function () {
                    that.refreshDisplayQuickViewList();
                });

                deferred.resolve();

            }, 'quickViewEntry');
        } else {
            deferred.resolve();
        }
        return deferred;*/
    }
    handlePagination() {
        //  clear pageList and count so we can reset the whole data
        this.pageList = [];
        this.count = -1;
        const data = this.cachedData;
        const curPage = this.cachedCurPage;
        this.setTotalPageNo(data);
        //  every time rest the pageList to fix on row not reach 5 items
        this.refreshPageList(data);
        //  if curPage existing means that this method call is from next page request,
        //  the current display data will not change only get next page data.
        if (!curPage) {
            data.itemList = this.pageList[0];
            this.cachedCurPage = 0;
            this.addImpressionCouLog('/sdp_quick_view_current_page_no', {pageNo: 1});
            //  TODO: push(this.cachedCurrentPage/**+1*/)

            // TODO: checkCntLess5ForCurPage for first Page
            this.loggedPageList.push(1);
        } else {
            // if clicked current page count less 5
            this.checkCntLess5ForCurPage(data);
            this.enableBtn();
            return;
        }
        //  TODO: move to first page
        this.refreshTemplateData(data);
        if (this.count > 0) {
            this.container.find(this.el.recommendItemNext).addClass(this.el.recommendItemNextActive);
        }
    }
    setTotalPageNo(data) {
        if (this.totalPage === 0) {
            // only has one page and total page is not correct
            if (data.nextPageUrl === null) {
                this.totalPage = 1;
                return;
            }
            this.totalPage = Math.ceil(parseFloat(data.totalCount / 5));
            //  we will show most 10 page and each page 5 items
            if (this.totalPage > 10) {
                this.totalPage = 10;
            }
        }
    }

    //  TODO: encapsulate data dup check module and page provider
    refreshPageList(data) {
        //  TODO :  ...data.itemList => data.itemList
        const dataList = this.quickViewList.concat(...data.itemList);
        // remove the duplicated products
        this.filterDuplicatedProducts(dataList);
        for (let i = 0; i < this.quickViewList.length; i += 5) {
            this.pageList[++this.count] = this.quickViewList.slice(i, i + 5);
        }
        this.cachedQuickViewList = [...this.quickViewList];
        //  TODO: check duplicate assign
        this.cachedData = data;
        this.cachedNextPageUrl = data.nextPageUrl;
        this.cachedPageList = [...this.pageList];
    }
    filterDuplicatedProducts(dataList) {
        const flags = {};
        //  TODO : test in IE8,  $.grep

        // TODO: pass [dupId, dupId, dupId...] to backend
        this.quickViewList = dataList.filter(function (product) {
            if (flags[product.productId]) {
                return false;
            }
            flags[product.productId] = true;
            return true;
        });
    }
    checkCntLess5ForCurPage(data) {
        if (this.isLastPage(data, this.cachedCurPage)) {
            // fix the next page url is not null but same with itself
            this.cachedNextPageUrl = null;
            return;
        }
        if (this.stopClickEvent) {
            this.stopClickEvent = false;
            this.refreshPageInfo(data, this.cachedCurPage);
        }
    }
    refreshPageInfo(data, pageNo) {
        data.itemList = this.cachedPageList[pageNo];
        this.refreshTemplateData(data);
        this.addPageImpressionCouLog(pageNo);
        this.preNextBtnRefreshAfterClickNext(pageNo);
    }
    isLastPage(data, curPage) {
        const nextPage = curPage + 1;
        // next page is last page
        if (!this.cachedPageList[nextPage] || this.cachedPageList[nextPage].length === 0) {
            this.totalPage = nextPage;
            this.refreshPageInfo(data, curPage);
            this.refreshPageNo(nextPage);
            return true;
        }
        return false;
    }
    refreshTemplateData(data) {
        if (this.invalidFlag) {
            data.addInvalidFlag = true;
        }
        const html = this.quickViewTemplate(data);
        this.container.html(html).show();
        const curPageNum = this.cachedCurPage + 1;
        this.refreshPageNo(curPageNum);
    }
    refreshPageNo(curPage) {
        const countPart = `<span><em>${curPage}</em>/${this.totalPage}</span>`;
        this.container.find(this.el.recommendPageNum).html(countPart);
    }
    //  TODO: check delegate
    bindEventForRecommendItem() {
        const that = this;
        this.container.on('mouseenter', that.el.recommendItemImageInfo, function (e) {
            e.preventDefault();
            that.addImpressionCouLog('/sdp_quick_view_zoom_button');
        });
        this.container.on('click', that.el.recommendItemIcon, function (e) {
            e.preventDefault();
            e.stopPropagation();

            let index = $(e.currentTarget).data('index');
            //  if has pagination then index need to add page count
            if (that.el.hasPreNextBtn) {
                index = index + that.cachedCurPage * 5;
            }
            that.popupQuickView(index);
            that.addClickCouLog('/click_sdp_quick_view_zoom_button', {toPage: 'QuickView'});
        });
        if (this.el.hasPreNextBtn) {
            this.container.on('click', that.el.recommendItemNext, function (e) {
                e.preventDefault();
                const pageList = that.cachedPageList;
                let curPage = that.cachedCurPage;
                const data = that.cachedData;
                //  if the next btn is not active, will not handle this event
                if (!that.container.find(that.el.recommendItemNext).hasClass(that.el.recommendItemNextActive)) {
                    return;
                }
                data.itemList = pageList[++curPage];
                // ex. when i click one item on first page, then choose sec page from quick view, this kind of case
                // should send next request
                if (!data.itemList || pageList[curPage].length < 5) {
                    that.sendNextRequest(data, curPage);
                    that.stopClickEvent = true;
                    return;
                }
                that.cachedCurPage = curPage;
                that.refreshTemplateData(data, true);
                that.preNextBtnRefreshAfterClickNext(curPage);
                that.addPageImpressionCouLog(curPage);
                //  when there is next page, will send request when current page is the last sec page
                if (curPage === pageList.length - 1) {
                    that.sendNextRequest(data, curPage);
                }
            });
            this.container.on('click', that.el.recommendItemPre, function (e) {
                e.preventDefault();
                let curPage = that.cachedCurPage;
                if (curPage === 0) {
                    that.container.find(that.el.recommendItemPre).removeClass(that.el.recommendItemPreActive);
                    return;
                }
                const data = that.cachedData;
                const pageList = that.cachedPageList;
                that.cachedCurPage = --curPage;
                data.itemList = pageList[curPage];
                that.refreshTemplateData(data, false);
                that.preNextBtnRefreshAfterClickPre(curPage);
                // that.addClickCouLog('/click_sdp_quick_view_left_button');
            });
        }
    }
    preNextBtnRefreshAfterClickNext(curPage) {
        if (curPage > 0) {
            this.container.find(this.el.recommendItemPre).addClass(this.el.recommendItemPreActive);
        }
        if (curPage < this.totalPage - 1) {
            this.container.find(this.el.recommendItemNext).addClass(this.el.recommendItemNextActive);
        } else {
            this.container.find(this.el.recommendItemNext).removeClass(this.el.recommendItemNextActive);
        }
    }
    preNextBtnRefreshAfterClickPre(curPage) {
        if (curPage > 0) {
            this.container.find(this.el.recommendItemPre).addClass(this.el.recommendItemPreActive);
        }
        if (curPage < this.totalPage) {
            this.container.find(this.el.recommendItemNext).addClass(this.el.recommendItemNextActive);
        }
    }
    sendNextRequest(data, curPage) {
        this.cachedCurPage = curPage;
        if (this.cachedNextPageUrl) {
            this.restUrl = this.cachedNextPageUrl;
            this.disableBtn();
            this.fetchData();
        } else {
            this.refreshTemplateData(data);
            const nextPage = curPage + 1;
            this.totalPage = nextPage;
            this.refreshPageNo(nextPage);
            this.preNextBtnRefreshAfterClickNext(curPage);
        }
    }
    disableBtn() {
        this.container.find(this.el.recommendItemNext).prop('disabled', true);
    }
    enableBtn() {
        this.container.find(this.el.recommendItemNext).removeProp('disabled');
    }
    addPageImpressionCouLog(curPage) {
        const pageNo = curPage + 1;
        if (this.loggedPageList.indexOf(pageNo) === -1) {
            this.addImpressionCouLog('/sdp_quick_view_current_page_no', {pageNo, });
            this.loggedPageList.push(pageNo);
        }
        // this.addClickCouLog('/click_sdp_quick_view_right_button');
    }
    addImpressionCouLog(customUrl, params) {
        const extraParam = {
            page: 'SDP',
            type: 'sdpQuickView',
            contents: 'sdpQuickView',
            sourceType: this.el.sourceType,
            productId: this.productId,
            vendorItemId: this.vendorItemId,
            itemId: this.itemId,
            invalid: this.invalidFlag
        };
        const logParams = Object.assign(extraParam, params);
        couLog.execManualLogging({
            logCategory: 'view', logType: 'impression', customURL: customUrl,
            logLabel: extraParam.contents, extraParam: $.param(logParams)
        });
    }
    addClickCouLog(clickCustomUrl, params) {
        const extraParam = {
            page: 'SDP',
            type: 'sdpQuickView',
            contents: 'sdpQuickView',
            sourceType: this.el.sourceType,
            productId: this.productId,
            vendorItemId: this.vendorItemId,
            itemId: this.itemId,
            invalid: this.invalidFlag
        };
        const logParams = Object.assign(extraParam, params);
        couLog.execManualLogging({
            logCategory: 'event', logType: 'click', customURL: clickCustomUrl,
            logLabel: extraParam.contents, extraParam: $.param(logParams)
        });
    }
    popupQuickView(index) {
        /*  const that = this;
        this.ensureQuickViewWindow().done(function () {
            that.quickViewWindow.setState('quickViewList', that.cachedQuickViewList);
            that.quickViewWindow.setState('nextPageUrl', that.cachedNextPageUrl);
            that.quickViewWindow.sourceType = that.el.sourceType;
            if (that.quickViewWindow.getState('quickViewList')[index]) {
                that.quickViewWindow.setState(that.quickViewWindow.getState('quickViewList')[index]);
                that.quickViewWindow.setState('selectedIndex', index);
                that.quickViewWindow.refresh();
                that.quickViewWindow.open();
            }
        });*/
    }
    refreshDisplayQuickViewList() {
        const index = this.quickViewWindow.getState('selectedIndex');
        let pageCnt = 0;
        this.cachedSelIndex = index;
        const dataList = this.quickViewWindow.getState('quickViewList');
        this.filterDuplicatedProducts(dataList);
        const data = this.cachedData;
        const pageList = [];
        let count = -1;
        if (this.el.hasPreNextBtn) {
            const nextPageUrl = this.quickViewWindow.getState('nextPageUrl');
            for (let i = 0; i < this.quickViewList.length; i += 5) {
                pageList[++count] = this.quickViewList.slice(i, i + 5);
            }
            this.cachedPageList = [ ...pageList ];
            this.cachedNextPageUrl = nextPageUrl;
            pageCnt = parseInt(index / 5, 10);
            this.cachedCurPage = pageCnt;
            data.itemList = pageList[pageCnt];
            data.nextPageUrl = nextPageUrl;
            if (!nextPageUrl && this.isLastPage(data, pageCnt)) {
                return;
            }
            this.refreshTemplateData(data);
            this.preNextBtnRefreshAfterClickNext(pageCnt);
        }
    }
}

module.exports = QuickViewList;
