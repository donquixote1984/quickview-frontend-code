require('./CouponDownload.scss');
const $ = require('jquery');
const template = require('./CouponDownload.hbs');
const loginUrlHandler = require('common/template/loginUrlHandler');


const request = require('base/Request');
const LogUtils = require('base/LogUtils');
const Component = require('base/Component');

class CouponDownload extends Component {

    constructor(args) {
        super({...args, template});
        /**
         * coupon download depends on sale info , if sale info changes,  coupon download changes.
         * */
        this.getGlobalStore().watch('optionChanged', (optionData) => {
            const couponDownloadUrl = `${optionData.requestVendorItemUri}/coupons-json`;
            this.setState('couponDownloadUrl', couponDownloadUrl);
            this.update();
        });
        this.getGlobalStore().watch('blur', () => {
            this.hidePopup();
        });
    }


    initCouponDownloadEvent() {
        /**
         * coupon download btn close
         * */
        this.container.find('.quick-view-coupon-download-close').click(() => {
            this.hidePopup();
        });

        /**
         * coupon download btn popup
         * */
        this.container.find('.quick-view-download-btn').click((e) => {

            e.stopPropagation();

            if (this.popup) {
                this.hidePopup();
            } else {
                this.showPopup();
            }
        });


        this.container.on('click', '.quick-view-coupon-download-popup', (e) => {
            e.stopPropagation();
        });
        /**
         * coupon download item click
         * */
        this.container.on('click', '.quick-view-coupon-download-item-on', (e) => {

            e.stopPropagation();
            const $currentDownloadBtn = $(e.currentTarget);
            const index = $currentDownloadBtn.data('index');
            const couponDownloadData = this.state.couponList[index];


            if (!loginUrlHandler.isLogin()) {
                let loginUrl = this.getGlobalStore().getState('apiUrl').loginWithReturnUrl || loginUrlHandler.getLoginUrl();
                loginUrl = loginUrl.replace('%7BvendorItemId%7D', this.getGlobalStore().getState('originVendorItemId'));
                $(location).attr('href', loginUrl);
                return;
            }
            /**
             * send log
             * */
            LogUtils.click().url('/click_coupon_download_item_on_quick_view_pop_up').param({sourceType: this.getGlobalStore().getState('sourceType')}).send();

            request(couponDownloadData.downloadUrl)
                .speedChecker({ key: this.getGlobalStore().getState('productId'), contents: 'couponDownload' })
                .speedCheckerRender(this.container)
                .then(result => {
                alert(result['message']); //eslint-disable-line
                $currentDownloadBtn.removeClass('quick-view-coupon-download-item-on').addClass('quick-view-coupon-download-item-off');
            });
        });
    }
    beforeConstruct() {

        const deferred = new $.Deferred(); //eslint-disable-line

        if (!this.getGlobalStore().getState('valid')) {
            return deferred.resolve();
        }
        const couponDownloadUrl = this.getState('couponDownloadUrl') || this.getGlobalStore().getState('apiUrl').couponUrl;

        request(couponDownloadUrl)
            .speedChecker({ key: this.getGlobalStore().getState('productId') })
            .speedCheckerRender(this.container)
            .done(data => {
            Object.assign(this.state, data);
            const couponCount = data.couponCount;
            if (couponCount === 0) {
                this.setState('hasCoupon', false);
            }

            deferred.resolve();
        });

        return deferred;
    }

    afterConstruct() {
        this.initCouponDownloadEvent();
    }

    showPopup() {

        /**
         * send log
         * */
        LogUtils.click().url('/click_coupon_download_on_quick_view_pop_up').param({sourceType: this.getGlobalStore().getState('sourceType')}).send();

        this.popup = true;
        const $popup = this.container.find('.quick-view-coupon-download-popup');
        $popup.css('left', - $popup.width() / 2 + 45);
        $popup.show();
        this.getGlobalStore().broadcast('showOverlay');
    }

    hidePopup() {
        this.popup = false;
        const $popup = this.container.find('.quick-view-coupon-download-popup');
        $popup.hide();
        this.getGlobalStore().broadcast('hideOverlay');
    }
}

module.exports = CouponDownload;
