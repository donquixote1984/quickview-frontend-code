require('./Detail.scss');
const $ = require('jquery');
const template = require('./Detail.hbs');

const request = require('base/Request');

const LogUtils = require('base/LogUtils');
const Component = require('base/Component');
class Detail extends Component {
    name = 'Detail';//eslint-disable-line
    constructor(args) {
        super({ ...args, template });

        this.getGlobalStore().watch('optionChanged', (optionData) => {
            /**
             * just for 'add to favorite' btn
             * */
            this.setState({
                productId: optionData.productId,
                vendorItemId: optionData.vendorItemId,
                itemId: optionData.itemId
            });

            this.setState('detailContentUrl', `/vp/products/${optionData.productId}/items/${optionData.itemId}/vendor-items/${optionData.vendorItemId}/detail-content`);
            this.update();

        });
    }

    beforeConstruct() {
        const deferred = $.Deferred();//eslint-disable-line
        if (this.getState('valid') === false) {
            return deferred.resolve();
        }
        const detailContentUrl = this.state.detailContentUrl || this.state.apiUrl.detailContentUrl;

         request(detailContentUrl)
             .speedChecker({ key: this.getGlobalStore().getState('productId'), contents: 'productItemDetail'})
             .speedCheckerRender(this.container)
             .then(data => {
             this.setState('imageUrl', data.repImageUrl.displayImageUrl);
             this.setState('detailContents', data.vendorItemContentVOList);
             this.setState('productContents', data.productContentVOList);
             deferred.resolve();
         });

        return deferred;
    }

    afterConstruct() {
        const $imgs = this.container.find('img');
        /**
         * make the representive image load first, and then the following detail image.
         * */
        this.container.find('.quick-view-representive').load(() => {
            this.container.find('.quick-view-detail-content').show();
        });

        if ($imgs.length === 0) {
            this.container.scrollTop(0);
        } else {
            $imgs.load(() => {
                this.container.scrollTop(0);
            });
        }
        this.container.on('scroll', () => {
            LogUtils.scroll().url('/scroll_details_on_pop_up').param({sourceType: this.getGlobalStore().getState('sourceType')}).send();
            this.container.off('scroll');
        });

    }
}
module.exports = Detail;
