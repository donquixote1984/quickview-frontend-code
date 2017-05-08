require('./Favorite.scss');
const $ = require('jquery');
const template = require('./Favorite.hbs');
const loginUrlHandler = require('common/template/loginUrlHandler');

const request = require('base/Request');

const LogUtils = require('base/LogUtils');
const Component = require('base/Component');

class Favorite extends Component {
    constructor(args) {
        super({ ...args, template });

        this.getGlobalStore().watch('optionChanged', (optionData) => {
            this.state.favoriteParam = `?itemId=${optionData.itemId}&vendorItemId=${optionData.vendorItemId}`;
            this.state.operation = 'check';
            this.update();
        });
    }

    beforeConstruct(initialState) {

        const deferred = $.Deferred(); //eslint-disable-line

        if (!this.getGlobalStore().getState('valid')) {
            return deferred.resolve();
        }


        this.state.favoriteUrlPrefix = `/vp/products/${this.getGlobalStore().getState('productId')}/wish-item/`;

        this.state.operation = this.state.operation || 'check';

        this.state.favoriteParam = this.state.favoriteParam || `?itemId=${this.getGlobalStore().getState('itemId')}&vendorItemId=${this.getGlobalStore().getState('vendorItemId')}`;


        const favoriteUrl = this.state.favoriteUrlPrefix + this.state.operation + this.state.favoriteParam;
        request(favoriteUrl)
            .then((result) => {
            /**
             *
             * What the hellthat if it is 'check' it returns {favorite: true|false}
             *
             * if it is 'add|delete' it return 'true|false'
             *
             * so it needs to resolve
             **/

            if ($.isPlainObject(result)) {
                this.state.on = result.favorite;
            }

        }).always(() => {
            deferred.resolve();
        });

        return deferred;
    }

    afterConstruct() {
        this.container.find('a').click(() => {

           if (!loginUrlHandler.isLogin()) {
                let loginUrl = this.getGlobalStore().getState('apiUrl').loginWithReturnUrl || loginUrlHandler.getLoginUrl();
                loginUrl = loginUrl.replace('%7BvendorItemId%7D', this.getGlobalStore().getState('originVendorItemId'));
                $(location).attr('href', loginUrl);
                return;
            }

            this.state.on = !this.state.on;
            this.state.operation = this.state.on ? 'add' : 'delete';

            if (this.state.on) {
                LogUtils.click().url('/click_add_favorite_on_quick_view_pop_up').param(this.getGlobalStore().getIds()).param({sourceType: this.getGlobalStore().getState('sourceType')}).send();
            } else {
                LogUtils.click().url('/click_delete_favorite_on_quick_view_pop_up').param(this.getGlobalStore().getIds()).param({sourceType: this.getGlobalStore().getState('sourceType')}).send();
            }
            this.update();
        });
    }
}

module.exports = Favorite;
