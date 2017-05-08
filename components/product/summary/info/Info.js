require('./Info.scss');
const $ = require('jquery');
const template = require('./Info.hbs');
const stringUtils = require('common/utils/stringUtils');

const request = require('base/Request');
const Component = require('base/Component');
const essentialData = require('common/essentialData');
class Info extends Component {
    name = 'Info';//eslint-disable-line
    constructor(args) {
        super({ ...args, template });

        this.setState('loading', true);

        this.getGlobalStore().watch('summary', (summary) => {
            Object.assign(this.state, { ...summary.saleInfo, ...summary.pdd, globalShippingFee: summary.globalShippingFee});
            this.update();
        });
        this.getGlobalStore().watch('saleInfoLoading', (isLoading) => {
            isLoading ? this.container.find('.quick-view-summary-info').addClass('loading') :
                this.container.find('.quick-view-summary-info').removeClass('loading');
        });
        /**
         * shipping fee is determined by the buy amount
         * */

        this.getGlobalStore().watch('quantity', (quantity) => {
            this.updateShippingFee(quantity);
            this.updatePdd(quantity);
        });

        this.getGlobalStore().watch('quantityBasedInfo', (quantityBasedInfo) => {
            //  update quantity based info
            //  update cash promotion;
            this.setState('cashPromotionMessage', quantityBasedInfo.cashPromotionMessage);
        });
    }

    updatePdd(quantity) {

        let cachedPdd = this.getState('cachedPdd');

        /**
         * first time call, there is no cachedPdd
         * */
        if (!cachedPdd) {
            cachedPdd = {};
            this.setState('cachedPdd', cachedPdd);
        }

        /**
         * damn pDD is vendorItem and quantity based, so need to use 2 dim array
         * */
        const vendorItemId = this.getGlobalStore().getState('vendorItemId');
        if (cachedPdd[vendorItemId] && cachedPdd[vendorItemId][quantity]) {

            this.setState('deliveryDateDescriptions', cachedPdd[vendorItemId][quantity]);

        } else {
            let pddUrl = '/vp/products/' + this.getGlobalStore().getState('productId') + '/vendor-items/' + this.getGlobalStore().getState('vendorItemId') + '/pdd';//eslint-disable-line
            pddUrl+=('?deliveryType='+this.state.deliveryType+'&quantity='+quantity);//eslint-disable-line

            request(pddUrl)
                .then(data => {
                    if (data && data.deliveryDateDescriptions) {
                        this.setState('deliveryDateDescriptions', data.deliveryDateDescriptions);
                        if (!cachedPdd[vendorItemId]) {
                            cachedPdd[vendorItemId] = {};
                        }
                        cachedPdd[vendorItemId][quantity] = data.deliveryDateDescriptions;
                    }
                });
        }
    }

    updateShippingFee(quantity) {
        /**
         * copy logic @ productOrderSheet.setShippingFeeVisibility()
         * */
        const [
            chargeType,
            logistics,
            freeShipOverAmount] =
            [
                this.state.deliveryFee.chargeType,
                this.state.logistics,
                parseFloat(this.state.deliveryFee.freeShipOverAmount)
            ];
        const SHIPPING_FEE_WORD = '이상 구매 시 무료배송';
        const FREE_SHIPPING_WORD = '무료배송';
        const totalPrice = this.state.salePrice * quantity;
        const globalBadgeText = essentialData.getAbTestOptionByKey('2543') === 'A' ? '쿠팡직구' : '로켓직구';
        if (chargeType === 'EVENT' || chargeType === 'CONDITIONAL') {
            if (logistics) {
                //  coupang rocket case
                if (totalPrice < freeShipOverAmount) {
                    //  set shipping fee as it is.
                    const conditionalShippingFee = $(`<span><em class="prod-txt-bold">${FREE_SHIPPING_WORD}</em> (로켓배송 상품으로 ${stringUtils.getCommaNumber(freeShipOverAmount)}원 이상 구매 시)</em></span>`);
                    this.setState('deliveryFee.shippingFeeMessage', conditionalShippingFee);
                } else {
                    //  just set shipping fee for free
                    this.setState('deliveryFee.shippingFeeMessage', $(`<em class="prod-txt-bold">${FREE_SHIPPING_WORD}</em>`));
                }
                return;
            }
            //  coupang global case
            if (this.state.majorPrice > freeShipOverAmount) {
                /**
                 * if the unit price is already larger than free ship over amount , this display mesasge will be handled
                 * while landing, do not need to change the shipping fee label
                ***/
                return;
            }

            const shippingFee = parseFloat(this.state.deliveryFee.shippingFee);
            if (totalPrice >= freeShipOverAmount) {
                this.setState('deliveryFee.shippingFeeMessage', $(`<em class="prod-txt-bold">${FREE_SHIPPING_WORD}</em>`));
            } else {
                // Global shipping fee style is changed, if it is true and total price < freeShipOverAmount
                // no need to change style
                if (this.state.globalShippingFee) {
                    const conditionalShippingFeeMsg = `<span><em class="prod-txt-bold">${FREE_SHIPPING_WORD}</em> (${globalBadgeText} 상품으로 29,800원 이상 구매 시)</span>`;
                    this.setState('deliveryFee.shippingFeeMessage', $(conditionalShippingFeeMsg));
                } else {
                    const conditionalShippingFeeMsg = `<span><em class="prod-txt-black">+${stringUtils.getCommaNumber(shippingFee)}원</em> 배송비<em class="prod-txt-gray"> (${stringUtils.getCommaNumber(freeShipOverAmount)}원 ${SHIPPING_FEE_WORD})</em></span>`;
                    this.setState('deliveryFee.shippingFeeMessage', $(conditionalShippingFeeMsg));
                }
            }

        }

    }

}

module.exports = Info;
