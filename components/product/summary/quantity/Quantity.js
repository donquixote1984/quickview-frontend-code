require('./Quantity.scss');
const $ = require('jquery');

const template = require('./Quantity.hbs');
const validationUtils = require('common/utils/validationUtils');

const request = require('base/Request');
const Component = require('base/Component');

class Quantity extends Component {

    name = 'Quantity'; //eslint-disable-line

    constructor(args) {
        super({ ...args, template });
        /**
         * reset after option changed.
         * */
        this.getGlobalStore().watch('summary', (summary) => {

            Object.assign(this.state, summary.saleInfo);
            Object.assign(this.state, {
                quantity: this.state.soldOut ? 0 : 1
            });

            this.getGlobalStore().assignState('quantity', this.getState('quantity'));

            if (this.state.soldOut) {
                this.getGlobalStore().broadcast('oos');
            }
            this.update();
        });


        this.watch('quantity', (currentQuantity) => {
            const quantityInput = this.container.find('.quick-view-quantity-info-input');
            //  1. check if larger than buyableQuantity, if yes, popup a tips
            //  2. check if almost sold out
            //  3. calculate total price
            //  4. update  & cache pdd
            //  5. btn  reset

            this.btnReset(currentQuantity);

            if (currentQuantity > this.state.buyableQuantity) {
                this.handleQuantityLargerThanBuyable();
                quantityInput.val(isNaN(this.state.buyableQuantity) ? 1 : this.state.buyableQuantity);
                this.state.quantity = this.state.buyableQuantity;
                currentQuantity = this.state.buyableQuantity;

            } else if (currentQuantity === 0) {
                quantityInput.val(1);
                this.state.quantity = 1;
                currentQuantity = 1;
            } else {
                this.handleQuantitySmallerThanBuyable();
                quantityInput.val(isNaN(currentQuantity) ? 1 : currentQuantity);
            }

            this.getGlobalStore().setState('quantity', currentQuantity);

            this.getGlobalStore().broadcast('quantityBasedInfo', this.updateQuantityBaseInfo(currentQuantity));
        });
    }

    afterConstruct() {

        this.initKeyInput();
        this.initButtonClick();
    }

    initKeyInput() {
        const quantityInput = this.container.find('.quick-view-quantity-info-input');

        /**
         * this event just prevent the invalid character;
         * */
        quantityInput.on('keydown', (e) => {
            this.forceInputNumeric(e);
        });

        /**
         * this event is for value updating.
         * */
        quantityInput.on('input', (e) => {
            /**
             * if user is deleting the count to empty, and have not trigger the focus out, just do not update the state
             * */
            const value = $(e.currentTarget).val();
            if (isNaN(value)) {
                return;
            }
            if (validationUtils.isEmpty(value)) {
                return;
            }
            this.setState('quantity', parseInt(value, 10));
        });

        quantityInput.on('focusout', (e) => {
            /**
             * resolve the empty leaving event.
             * */
            const value = $(e.currentTarget).val();
            if (validationUtils.isEmpty(value)) {
                this.setState('quantity', 1);
            }
        });

    }

    initButtonClick() {
        const quantityButton = this.container.find('.quick-view-quantity-btn');

        quantityButton.click((e) => {
            const btn = $(e.currentTarget);
            const quantityFactor = btn.data('control') === 'add' ? 1 : -1;
            this.setState('quantity', this.getState('quantity') + quantityFactor);
        });

    }


    handleQuantityLargerThanBuyable() {
        const quantityMessage = `선택 가능한 수량은 ${this.state.buyableQuantity}개입니다.`;
        const tooltip = this.container.find('.quick-view-soldout-tooltip');
        tooltip.html(quantityMessage);
        tooltip.fadeIn(() =>
            setTimeout(() => {
                tooltip.fadeOut();
            }, 2000)
        );
    }

    handleQuantitySmallerThanBuyable() {
        this.container.find('.quick-view-soldout-tooltip').hide();
    }

    /**
     * based on current quantity, reset the 'add', 'minus' button to disable if needed.
     * */
    btnReset(currentQuantity) {
        const quantityBtn = this.container.find('.quick-view-quantity-btn');
        quantityBtn.removeProp('disabled');

        if (currentQuantity > this.state.buyableQuantity) {
            quantityBtn.eq(0).prop('disabled', 'disabled');
        }
        if (currentQuantity === 1 || currentQuantity === 0 || this.state.buyableQuantity === 1) {
            quantityBtn.eq(1).prop('disabled', 'disabled');
        }
    }

    forceInputNumeric(e) {

        // Allow: backspace, delete, tab, escape, enter and .
        if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110]) !== -1 ||
            // Allow: Ctrl+A
            (e.keyCode === 65 && e.ctrlKey === true) ||
            // Allow: Ctrl+C
            (e.keyCode === 67 && e.ctrlKey === true) ||
            // Allow: Ctrl+X
            (e.keyCode === 88 && e.ctrlKey === true) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)) {
            // let it happen, don't do anything
            return false;
        }
        // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
            return false;
        } else { //eslint-disable-line
            return true;
        }
    }

    updateQuantityBaseInfo(quantity) {

        let cachedQuantityBasedInfo = this.getState('cachedQuantityBasedInfo');

        /**
         * first time call, there is no cachedQuantityBasedInfo
         * */
        if (!cachedQuantityBasedInfo) {
            cachedQuantityBasedInfo = {};
            this.setState('cachedQuantityBasedInfo', cachedQuantityBasedInfo);
        }

        /**
         * damn quantitybasedinfo is based on quantity and vendorItemId
         * */
        const vendorItemId = this.getGlobalStore().getState('vendorItemId');
        if (cachedQuantityBasedInfo[vendorItemId] && cachedQuantityBasedInfo[vendorItemId][quantity]) {
            return cachedQuantityBasedInfo[vendorItemId][quantity];
        }

        const quantityBasedInfoUrl = `/vp/products/${this.getGlobalStore().getState('productId')}/vendor-items/${this.getGlobalStore().getState('vendorItemId')}/quantity-based-infos?quantity=${quantity}`;
        return request(quantityBasedInfoUrl)
            .speedChecker({ key: this.getGlobalStore().getState('productId'), contents: 'quantityBasedInfo'})
            .speedCheckerRender(this.container).then((data) => {
                if (!cachedQuantityBasedInfo[vendorItemId]) {
                    cachedQuantityBasedInfo[vendorItemId] = {};
                }
                cachedQuantityBasedInfo[vendorItemId][quantity] = data;
            }).promise();
    }
}

module.exports = Quantity;
