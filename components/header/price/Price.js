require('./Price.scss');
const $ = require('jquery');
const template = require('./Price.hbs');
const essentialData = require('common/essentialData');
const stringUtils = require('common/utils/stringUtils');

const request = require('base/Request');
const Component = require('base/Component');

class Price extends Component {

    name = 'Price'; //eslint-disable-line
    constructor(args) {
        super({ ...args, template });
        this.getGlobalStore().watch('optionChanged', (optionData) => {

            this.setState('saleInfoUri', `${optionData.requestVendorItemUri}/sale-info-json`);
            this.update();
        });
    }

    beforeConstruct() {
        const deferred = $.Deferred();//eslint-disable-line

        this.setState({
            /**
             * can not just use 'salePriceWithTag' because 'salePriceWithTag' has a '원' , but price returned by sale-info-json ajax
             * does not have a '원'!
             * */
            formattedSalePrice: this.getState('formattedSalePrice') || stringUtils.getCommaNumber(this.getGlobalStore().getState('salesPrice')),
            unitPrice: this.getState('unitPrice') || this.getGlobalStore().getState('unitPrice'),
            logistics: this.getState('logistics') !== null ? this.getState('logistics') : this.getGlobalStore().getState('logistics'),
            coupangGlobal: this.getState('coupangGlobal') !== null ? this.getState('coupangGlobal') : this.getGlobalStore().getState('coupangGlobal'),
            majorPrice: this.getState('majorPrice') || this.getGlobalStore().getState('salePrice'),
            /**
             * if it is a invalid page, just disable loading icon.
             * */
            loading: !!this.getState('valid')
        });
        /**
         * if unit price contains '(' or ')', just remove it
         * */
        if (this.getState('unitPrice')) {
            this.setState('unitPrice', this.getState('unitPrice').replace(/[{()}]/g, ''));
        }
        /**
         * invalid product
         * */
        if (!this.getGlobalStore().getState('valid')) {

            return deferred.resolve();
        }
        /**
         * just send out the sale info request, BUT preload the cached data from quick view list, which is stored at globalStore.
         * */
        this.getGlobalStore().broadcast('saleInfoLoading', true);
        const saleInfoUri = this.getState('saleInfoUri') || this.getGlobalStore().getState('apiUrl').saleInfoUrl;
        request(saleInfoUri)
            .speedChecker({ key: this.getGlobalStore().getState('productId'), contents: this.isFashionStyle() ? 'fashionPriceInfo' : 'priceInfo' })
            .speedCheckerRender(this.container)
            .done(data => {
                //  this.setDeepState("saleInfos",data.saleInfos);
                /**
                 * broadcast the global sale info data to the section which below the options
                 * */

                const rawSaleInfo = data.saleInfo;
                const saleInfo = rawSaleInfo.oneTimeInfo ? {...rawSaleInfo.oneTimeInfo} : {...rawSaleInfo};

                /**
                 * if there is coupon price , just set coupon price as the major display price(can be multiply and font red)
                 * */
                saleInfo.majorPrice = saleInfo.couponPrice ? saleInfo.couponPrice : saleInfo.salePrice;

                /**
                 * if option change event broadcasted, this.vendorItemRequestUri will be update in the globalStore.watch('optionChanged')
                 * method and this vendorItemRequestUri will be used in the component which depends the Price component , these component will
                 * use the vendorItemRequestUri to send some other ajax calls.
                 *
                 * if landing, there is no globalStore.watch('optionChanged') event triggered, so this.vendorItemRequestUri will be set
                 * to a default value `/vp/products/${productId}/vendor-items/${vendorItemId}`
                 * */
                if (!this.getState('vendorItemRequestUri')) {
                    const productId = this.getGlobalStore().getState('productId');
                    const vendorItemId = this.getGlobalStore().getState('vendorItemId');
                    this.setState('vendorItemRequestUri', `/vp/products/${productId}/vendor-items/${vendorItemId}`);
                }
                this.getGlobalStore().setState('summary', { saleInfo, pdd: data.pdd, globalShippingFee: data.globalShippingFee, vendorItemRequestUri: this.vendorItemRequestUri });
                this.getGlobalStore().broadcast('saleInfoLoading', false);
                this.parseData(saleInfo);
                this.setState('badgeUrl', data.pdd.deliveryBadgeUrl);
                this.setState('loading', false);
                this.render();
        });

        deferred.resolve();
        return deferred;
    }

    afterConstruct() {
        this.container.find('.price-infos>li').last().addClass('noseparator');
    }

    parseData(data) {
        const oneTimeInfo = data.oneTimeInfo || data;
        Object.assign(this.state, {
            vendorItemId: oneTimeInfo.vendorItemId,
            itemId: oneTimeInfo.itemId,
            inventory: oneTimeInfo.inventory,
            buyableQuantity: oneTimeInfo.databuyableQuantity,

            unitPrice: oneTimeInfo.unitPrice,

            discountRate: oneTimeInfo.discountRate,
            couponPriceTitle: oneTimeInfo.couponPriceTitle,

            hasOriginPrice: (!!oneTimeInfo.originPrice) && (oneTimeInfo.originPrice > oneTimeInfo.salePrice),
            originPrice: oneTimeInfo.originPrice,
            formattedOriginPrice: oneTimeInfo.formattedOriginPrice,

            salePrice: oneTimeInfo.salesPrice,
            formattedSalePrice: oneTimeInfo.formattedSalePrice,

            hasCouponPrice: !!oneTimeInfo.couponPrice,
            couponPrice: oneTimeInfo.couponPrice,
            formattedCouponPrice: data.formattedCouponPrice,

            couponUnitPrice: oneTimeInfo.couponUnitPrice,
            couponDownloadUrl: oneTimeInfo.couponDownloadUrl,

            logistics: oneTimeInfo.logistics,
            coupangGlobal: oneTimeInfo.coupangGlobal,

            skuBundleConditionalFreeShippingPrice: oneTimeInfo.skuBundleConditionalFreeShippingPrice,
            formattedSkuBundleConditionalFreeShippingPrice: oneTimeInfo.formattedSkuBundleConditionalFreeShippingPrice,

            instantDiscount: oneTimeInfo.instantDiscount,
            soldOut: oneTimeInfo.soldOut,
            almostSoldOut: oneTimeInfo.almostSoldOut,

            deliveryType: oneTimeInfo.deliveryType,
            formattedInventory: oneTimeInfo.formattedInventory
        });
    }

    isFashionStyle() {
        return essentialData.getState('sdpStyle') === 'FASHION_STYLE_ONE_WAY' || essentialData.getState('sdpStyle') === 'FASHION_STYLE_TWO_WAY';
    }

}

module.exports = Price;
