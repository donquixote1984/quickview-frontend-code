const $ = require('jquery');
require('./QuickViewWindow.scss');
const template = require('./QuickViewWindow.hbs');
const GlobalStore = require('./store/GlobalStore');


const request = require('./base/Request.js');

const LogUtils = require('./base/LogUtils');
const Component = require('./base/Component');
/**
 *
 * if ie8,
 * babel-polyfill: can not use
 * es6-shim: can not use
 * es5-shim: can use
 *
 * the quick view window needs polyfills as below:
 *
 * object assign
 * promise
 *
 * **/

class QuickViewWindow extends Component {
    landingUri = ''; //eslint-disable-line
    sourceType = ''; //eslint-disable-line
    constructor() {
        super({ template, element: $('.prod-quick-view')});

        this.$htmlAndBody = $('html, body');
        this.$shadow = this.$htmlAndBody.find('.quick-view-shadow');
        this.template = template;
        this.globalStore = new GlobalStore();

        /** add spinner while refreshing*/
        this.getGlobalStore().watch('refresh', data => {

            this.loading(true);
            this.getGlobalStore().clear();
            this.getGlobalStore().setState(data);
            this.build({...data, sourceType: this.sourceType});
        });

        this.getGlobalStore().watch('showOverlay', () => {
            this.container.find('.quick-view-overlay').show();
        });

        this.getGlobalStore().watch('hideOverlay', () => {
            this.container.find('.quick-view-overlay').hide();
        });

        this.getGlobalStore().watch('optionChanged', optionData => {

            this.getGlobalStore().setState({
                productId: optionData.productId,
                vendorItemId: optionData.vendorItemId,
                itemId: optionData.itemId
            });
        });

        this.container.click(e => {
            e.stopPropagation();
            this.getGlobalStore().broadcast('blur');
            if ($(e.target).is('.quick-view-close')) {
                this.close();
            }
        });

        this.initShadow();
    }


    initShadow() {
        this.$shadow.on('click', e => {
            e.stopPropagation();
            this.close();
        });
    }
    refresh(data) {
        this.getGlobalStore().broadcast('refresh', data || this.getState());
    }
    open() {
        this.$shadow.show();
        this.$htmlAndBody.css({
            overflowX: 'hidden',
            overflowY: 'hidden'
        });
        this.container.show();
    }
    loading(loading) {
        loading ? $('.prod-quick-view').addClass('loading') : $('.prod-quick-view').removeClass('loading');
    }

    close() {
        this.container.hide();
        this.$shadow.hide();
        this.$htmlAndBody.css({
            overflowX: 'auto',
            overflowY: 'auto'
        });
        this.getGlobalStore().broadcast('close');
    }

    beforeConstruct(initialData) {
        const deferred = $.Deferred(); //eslint-disable-line
        //  this.mock();
        this.landingUri = `/vp/products/${this.state.productId}/quickview?vendorItemId=${this.state.vendorItemId}&itemId=${this.state.itemId}`;

        this.getGlobalStore().clear().setState(initialData);
        this.getGlobalStore().setState('valid', false);
        request(this.landingUri)
            .speedChecker({key: this.getGlobalStore().getState('productId'), contents: 'quickview'})
            .speedCheckerRender(this.container)
            .done(data => {

            const valid = data.vendorItemId !== null;

            this.getGlobalStore().setState({...data, productId: this.state.productId, itemId: this.state.itemId, valid}, false);
            this.getGlobalStore().setState('originVendorItemId', data.vendorItemId);
            Object.assign(this.state, { ...data, valid});

            this.getGlobalStore().setState('valid', valid);
            /**
             * send logs
             * */
            LogUtils.impression().url('/quick_view_pop_up').param({sourceType: this.getGlobalStore().getState('sourceType'), itemId: this.getGlobalStore().getState('itemId'),
                productId: this.getGlobalStore().getState('productId')}).send();

            }).fail(() => {
            /**
             * it is a invalid page.
             * */
            this.getGlobalStore().setState('valid', false);
            this.setState('valid', 'false');
        }).always(() => {
            deferred.resolve();
        });

        return deferred;
    }

    afterConstruct() {
        this.loading(false);
    }

    mock() {
        Object.assign(this.state, {
            productId: 1393855,
            vendorItemId: 3060259107,
            itemId: 2246824
        });
    }
}

module.exports = QuickViewWindow;
