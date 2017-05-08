require('./Review.scss');
const $ = require('jquery');
const template = require('./Review.hbs');
const itemTemplate = require('./ReviewItem.hbs');

const request = require('base/Request');
const LogUtils = require('base/LogUtils');
const Component = require('base/Component');

class Review extends Component {
    name='Review';//eslint-disable-line
    constructor(args) {
        super({ ...args, template });

        this.getGlobalStore().watch('blur', () => {
            this.container.find('.review-list').hide();
            this.container.find('.review-logs').removeClass('collapse');
            this.popup = false;
        });

        /**
         * additional request by MJ:
         * if switch option, the go to sdp page should be determined by the new itemId
         * */
        this.getGlobalStore().watch('optionChanged', (optionData) => {
            const sdpUrl = this.getGlobalStore().getState('apiUrl').sdpUrl;
            const $goToSdp = this.container.find('.quick-view-purchase-sdp');
            $goToSdp.attr('href', sdpUrl.replace('%7BitemId%7D', optionData.itemId));
        });
    }

    beforeConstruct() {
        var defer = $.Deferred();//eslint-disable-line
        this.state.available = false;

        const itemId = this.getGlobalStore().getState('itemId');
        this.state.sdpUrl = this.getGlobalStore().getState('apiUrl').sdpUrl.replace('%7BitemId%7D', itemId);
        if ($.isNumeric(this.state.ratingAverage)) {

            const ratingAverageFloat = parseFloat(this.state.ratingAverage);
            if (ratingAverageFloat === 0) {
                return defer.resolve();
            }
            if (ratingAverageFloat > 5) {

                return defer.resolve();
            }
            this.state.available = true;
            this.state._ratingPercentage = (ratingAverageFloat/5)*100 + '%'; //eslint-disable-line
        }

        const reviewUrl = this.getGlobalStore().getState('apiUrl').reviewRatingUrl;
        request(reviewUrl)
            .speedChecker({key: this.getGlobalStore().getState('productId'), contents: 'review-rating'})
            .speedCheckerRender(this.container)
            .then((reviewsData) => {
                this.parseData(reviewsData);
                if (this.getState('available')) {
                    this.render();
                }
            });

        return defer.resolve();
    }

    afterConstruct() {
        this.container.find('.review-logs').click((e) => {
            /**
             * if the review list returns empty,  just do not show the popup.
             * */
            e.stopPropagation();
            if (!this.popup) {
                this.getGlobalStore().broadcast('blur');
            }

            if (this.popup) {
                this.container.find('.review-list').hide();
                $(e.currentTarget).removeClass('collapse');
            } else {
                this.container.find('.review-list').show();
                $(e.currentTarget).addClass('collapse');
                this.getReviewList();
            }
            this.popup = !this.popup;

        });

        this.container.find('.review-list-close').click((e) => {
            this.container.find('.review-list').hide();
            this.container.find('.review-logs').removeClass('collapse');
            this.popup = false;
        });


        /**
         * send important log
         * */
        this.container.find('.quick-view-purchase-sdp').click((e) => {
            LogUtils.click().url('/click_go_to_sdp_on_quick_view_pop_up').param({sourceType: this.getGlobalStore().getState('sourceType')}).send();
        });

        this.container.find('.review-go-to-sdp').click((e) => {
            LogUtils.click().url('/click_product_review_see_more_on_quick_vew_pop_up').param({sourceType: this.getGlobalStore().getState('sourceType')}).send();
        });
        /**
         * log ends
         * */

        this.container.click((e) => {
            /**
             * stop event bubble so as to not trigger the 'blur' global event, and the
             * review popup will not close
             * */
            e.stopPropagation();
        });

    }

    getReviewList() {
        if (this.getState('reviews')) {
            return;
        }
        /**
         * send log
         * */
        LogUtils.click().url('/click_product_review_on_quick_view_pop_up').param({sourceType: this.getGlobalStore().getState('sourceType')}).send();

        const reviewListUrl = this.getGlobalStore().getState('apiUrl').reviewUrl;
        request(reviewListUrl)
            .speedChecker({key: this.getGlobalStore().getState('productId'), contents: 'reviews'})
            .speedCheckerRender(this.container)
            .then((reviews) => {

                if (!$.isArray(reviews)) {
                    return;
                }
                this.setState('reviews', reviews.slice(0, 3));
                const reviewList = this.container.find('.review-list-container');
                this.getState('reviews').forEach((review) => {
                    reviewList.find('>ul').append($(itemTemplate(review)));
                });
                this.container.find('.review-list').removeClass('loading');

                /**
                 * change scroll bar style
                 * */
                if (reviewList.length === 0) {
                  return;
                }
                if (reviewList[0].scrollHeight && reviewList[0].scrollHeight > reviewList.height()) {
                   //   there is a scroll bar
                    require('lib/jquery/plugin/jquery.mousewheel');
                    require('lib/jquery/plugin/jquery.jscrollpane.min');
                    reviewList.jScrollPane({contentWidth: '0px'});
                }
            });
    }

    parseData(reviewsData) {
        if ($.isNumeric(reviewsData.ratingAverage)) {
            const ratingAverageFloat = parseFloat(reviewsData.ratingAverage);
            if (ratingAverageFloat === 0) {
                return;
            }
            if (ratingAverageFloat > 5) {
                return;
            }
            this.setState({...reviewsData});
            this.setState('available', true);
        }
    }
}

module.exports = Review;
