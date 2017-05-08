const template = require('./TotalPrice.hbs');
const stringUtils = require('common/utils/stringUtils');

const Component = require('base/Component');

class TotalPrice extends Component {

    name = 'TotalPrice'; //eslint-disable-line

    constructor(args) {
        super({...args, template});

        this.getGlobalStore().watch('summary', (summary) => {
            this.update(summary);
        });

        this.getGlobalStore().watch('quantityBasedInfo', (quantityBasedInfo) => {
            if (quantityBasedInfo && quantityBasedInfo.couponPrice) {
                this.setState('displayPrice', quantityBasedInfo.couponPrice + '원');//eslint-disable-line
                this.setState('hasCouponTitle', true);
                this.setState('couponPriceTitle', quantityBasedInfo.couponPriceTitle);
                this.render();
            }
        });

        this.getGlobalStore().watch('quantity', (quantity) => {
            this.setState('hasCouponTitle', false);
            if (quantity === 0) {
                this.setState('displayPrice', '0원');
                this.render();
                return;
            }

            if (this.state.majorPrice) {
                this.setState('displayPrice', stringUtils.getCommaNumber(this.state.majorPrice * quantity)+'원'); //eslint-disable-line
                this.render();
            }
        });
    }

    beforeConstruct() {
        const deferred = $.Deferred() //eslint-disable-line
        let quantity = this.getGlobalStore().getState('quantity');
        if (!quantity) {
            quantity = 1;
        }

        if (this.state.majorPrice) {
            this.setState('displayPrice', stringUtils.getCommaNumber(this.state.majorPrice * quantity) + '원');//eslint-disable-line
        }

        if (this.state.couponPrice) {
            this.setState('hasCouponTitle', true);
        }

        if (quantity === 0) {
            this.setState('displayPrice', '0원');
        }

        if (this.getState('soldOut')) {
            this.setState('displayPrice', '0원');
        }
        return deferred.resolve();
    }

}

module.exports = TotalPrice;
