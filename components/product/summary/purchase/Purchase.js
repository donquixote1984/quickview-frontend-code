require('./Purchase.scss');
const $ = require('jquery');
const SpeedChecker = require('speedChecker');


const template = require('./Purchase.hbs');
const AddCartWiseLogger = require('common/reporter/AddCartWiseLogger');
const cookieUtils = require('common/utils/cookieUtils');
const LogUtils = require('base/LogUtils');
const Component = require('base/Component');

class Purchase extends Component {

    name = 'Purchase'; //eslint-disable-line

    constructor(args) {

        super({...args, template});

        this.cartUrl = $('.prod-cart-btn').data('carturl');

        this.orderUrl = $('.prod-buy-btn').data('orderurl');

        this.fdsCheck = $('.prod-buy').data('useFdsCheck');
        /**
         *  JUST show/refresh this component after the sale info returns
         *
         *
         *  here it need to watch the sales info because it depends on the buyable amount
         *
         *  if the buyable amount is 0 or user selected quantity is larger than buyable amount ,
         *  just do not trigger the 'add to cart' event.
         *
         * */
        this.getGlobalStore().watch('summary', (summary) => {

            Object.assign(this.state, summary.saleInfo);
            this.oos(this.getState('soldOut'));
        });
    }

    beforeConstruct() {
        const deferred = $.Deferred(); //eslint-disable-line
        this.setState('cartUrl', this.cartUrl);
        this.setState('orderUrl', this.orderUrl);
        this.setState('fdsCheck', this.fdsCheck);
        return deferred.resolve();
    }

    afterConstruct() {
        /**
         * init direct purchase and add to cart button event handle
         * */
        this.initDelegateEvents();
    }
    initDelegateEvents() {

        /**
         *  click the 'add to cart' btn
         * */
        this.container.on('click', '.quick-view-atc-btn', () => {

            LogUtils.click().url('/click_add_cart_on_quick_view_pop_up').param({sourceType: this.getGlobalStore().getState('sourceType')}).send();
            /**
             * test if can add to cart
             * */
            if (!this.canPurchase()) {
                alert('선택한 상품이 일시품절 되었습니다.'); //eslint-disable-line
                return;
            }
            this.fetchAddToCart().done(() => {
                const purchasePopup = this.container.find('.quick-view-purchase-popup');
                purchasePopup.show(0, () => setTimeout(() => purchasePopup.hide(), 3000));
            });
        });


        /**
         * click the 'direct purchase' btn
         * */
        this.container.on('click', '.quick-view-buy-btn', () => {

            LogUtils.click().url('/click_direct_purchase_on_quick_view_pop_up').param({sourceType: this.getGlobalStore().getState('sourceType')}).send();

            /**
             * test if can direct purchase
             * */
            if (!this.canPurchase()) {
                alert('선택한 상품이 일시품절 되었습니다.'); //eslint-disable-line
                return;
            }

            this.disableBtns();

            if (this.getState('fdsCheck')) {

                const speedChecker = new SpeedChecker({
                    page: 'SDP',
                    type: 'brandSDP',
                    method: 'async',
                    keyName: 'productId',
                    key: this.getGlobalStore().getState('productId'),
                    contents: 'checkFDS'
                });

                this.checkFDS().always((data) => {
                    speedChecker.endServer();
                    speedChecker.track();

                    this.enableBtns();

                    if (data && data.overLimit) {
                        alert(data.warningMessage); //eslint-disable-line
                        return;
                    }
                    this.checkout();

                });
            } else {
                this.checkout();
            }
        });
        /**
         * click the add to cart popup close btn
         * */
        this.container.on('click', '.quick-view-purchase-popup-close', () => {
            this.container.find('.quick-view-purchase-popup').hide();
        });
    }

    getOrderData() {
        const vendorItemId = this.getGlobalStore().getState('vendorItemId');
        const quantity = this.getGlobalStore().getState('quantity');

        return {
            items: [`${vendorItemId}:${quantity}`]
        };
    }

    fetchAddToCart() {
        this.disableBtns();
        /**
         * need to deal with all status:
         *
         * success, fail, always
         *
         * here just use jquery ajax api instead of fetch, cause fetch missing some utils
         * */

        const speedChecker = new SpeedChecker({
            page: 'SDP',
            type: 'brandSDP',
            method: 'async',
            keyName: 'productId',
            key: this.getGlobalStore().getState('productId'),
            contents: 'addCart'
        });

        return $.ajax({
            type: 'POST',
            url: `/vp/cart/${this.getGlobalStore().getState('productId')}/items`,
            dataType: 'json',
            timeout: 7000,
            data: this.getOrderData()
        })
        .fail(() => {alert('구매하실 수 없습니다.');}) //eslint-disable-line
        .always(() => {
            /**
             * avoid clicking too many times
             * */
            setTimeout(() => this.enableBtns(), 300);
        }).success((data) => {

            /**
             * if success ,  just add a log for frontend
             * */
            speedChecker.endServer();
            speedChecker.checkRendering('.prod-cart-btn');
            speedChecker.track();

            try {
                this.addCartLogging('CART', data, data.resultContents);
            } catch (e) {
                // console.log
            }

        });
    }


    addCartLogging(cartOrderType, addCartResultData, vendorItemIdWithCntList) {
        /**
         * just copy the function from productOrderButtonCartApi.addCartLogging
         * */
        const addCartWiseLogger = new AddCartWiseLogger(cartOrderType, addCartResultData.isLogin);
        const productId = this.getGlobalStore().getState('productId');
        const itemId = this.getGlobalStore().getState('itemId');
        addCartWiseLogger.pdpLogging(productId, vendorItemIdWithCntList, itemId);
        couLog.n_logging(`http://www.coupang.com/click_orderButton?buttonType=${cartOrderType}`);
    }

    disableBtns() {
        this.container.find('.quick-view-purchase-btn').prop('disabled', true);
    }
    enableBtns() {
        this.container.find('.quick-view-purchase-btn').removeProp('disabled');
    }

    canPurchase() {
        if (!this.state.buyableQuantity) {
            /**
             * can not buy because buyable quantity is 0
             * */
            return false;
        } else if (isNaN(this.getGlobalStore().getState('quantity'))) {
            /**
             * just screw the input
             * */
            return false;
        } else if (this.getGlobalStore().getState('quantity') === 0) {
            /**
             * just oos
             * */
            return false;
        } else if (this.getGlobalStore().getState('quantity') > this.state.buyableQuantity) {
            return false;
        }
        return true;
    }
    checkFDS() {
        return $.ajax({
            type: 'GET',
            url: `/vp/products/${this.getGlobalStore().getState('productId')}/vendor-items/${this.getGlobalStore().getState('vendorItemId')}/fraud-detector-limit-check`,
            dataType: 'json',
            timeout: 7000,
            data: {
                quantity: this.getGlobalStore().getState('quantity')
            }
        });
    }
    checkout() {
        if (!this.canPurchase()) {
            return;
        }

        this.disableBtns();

        const _speedChecker = new SpeedChecker({
            page: 'SDP',
            type: 'brandSDP',
            method: 'async',
            keyName: 'productId',
            key: this.getGlobalStore().getState('productId'),
            contents: 'directOrder'
        });

        $.ajax({
            type: 'POST',
            url: `/vp/direct-order/${this.getGlobalStore().getState('productId')}/items`,
            dataType: 'json',
            timeout: 7000,
            data: this.getOrderData()
        }).fail(() => this.goBuy(this.getOrderData())).always(() => {
            setTimeout(() => this.enableBtns(), 300);
        }).success((data) => {
            try {
            _speedChecker.endServer();
            _speedChecker.track();
            this.addCartLogging('ORDER', data, data.resultContents);

            const orderCheckoutUrl = data.orderCheckoutUrl;
            let checkoutUrl = orderCheckoutUrl.requestUrl;

            if (orderCheckoutUrl.newCheckoutUrl === false) {
                checkoutUrl += '&' + encodeURIComponent('sid=' + cookieUtils.getValue('sid')); //eslint-disable-line
            }

            $(location).attr('href', checkoutUrl);
            } catch (e) {
                this.goBuy(this.getOrderData());
            }
        });
    }

    goBuy() {
        this.enableBtns();
        const orderParam = {
            'option[]': ':' + this.getOrderData().items, //eslint-disable-line
            sid: cookieUtils.getValue('sid'),
            isDirectOrder: 'Y'
        };
        location.href = this.getState('orderUrl')+'?'+ $.param(orderParam); //eslint-disable-line
    }

    oos(isOos) {
        isOos ? this.container.hide() : this.container.show();
    }
}

module.exports = Purchase;
