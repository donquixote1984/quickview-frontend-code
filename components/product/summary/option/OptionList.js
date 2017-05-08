require('./Option.scss');
const $ = require('jquery');
const template = require('./OptionList.hbs');

const request = require('base/Request');
const Component = require('base/Component');

class OptionList extends Component {

    name='OptionList'; //eslint-disable-line

    constructor(args) {
        super({...args, template});
    }

    beforeConstruct() {
        var deferred = $.Deferred(); //eslint-disable-line

        const loadOptionUri = this.getGlobalStore().getState('apiUrl').optionsUrl;

        request(loadOptionUri)
            .speedChecker({ key: this.getGlobalStore().getState('productId'), contents: 'loadOptions' })
            .speedCheckerRender(this.container)
            .then(data => {
            this.state.vendorItemOptions = data.options;
            //  mockData.mock__2_option_many_many_totalcount(this,false)

            this.setState('firstOption', {
                available: true,
                index: 0,
                ...this.state.vendorItemOptions[0],
                selectedOption: this.getState('firstSelectedOption')
            });
            this.setState('optionCount', 1);
            if (this.state.vendorItemOptions.length > 1) {
                this.setState('secondOption', {
                    available: true,
                    index: 1,
                    ...this.state.vendorItemOptions[1],
                    selectedOption: this.getState('secondSelectedOption')
                });
                this.setState('optionCount', 2);
            }
        });
        //  divide option
        //  mockData.mock__2_option_many_many_totalcount(this,true)
        if (!$.isArray(this.state.vendorItemOptions)) {
            return deferred.resolve();
        }

        if (this.state.vendorItemOptions.length === 0) {
            return deferred.resolve();
        }

        /**
         * set landing option
         * */
        this.setState('firstOption', { available: true, index: 0, ...this.state.vendorItemOptions[0] });
        this.setState('firstSelectedOption', this.state.vendorItemOptions[0].selectedOption);
        this.getGlobalStore().setState('firstSelectedOption', this.getState('firstSelectedOption'));
        /**
         * because the total count is only retrieved by landing , and will be override by a null in the following
         * loadOption request, so the total count should be stored at globalStore at the first time
         * */

        this.getGlobalStore().setState('firstOptionCount', this.state.vendorItemOptions[0].totalCount || 1);
        this.getGlobalStore().setState('firstOptionLabel', this.state.vendorItemOptions[0].label);

        if (this.state.vendorItemOptions.length > 1) {
            this.setState('secondOption', { available: true, index: 1, ...this.state.vendorItemOptions[1] });
            this.setState('secondSelectedOption', this.state.vendorItemOptions[1].selectedOption);
            this.getGlobalStore().setState('secondSelectedOption', this.getState('secondSelectedOption'));
            this.getGlobalStore().setState('secondOptionCount', this.state.vendorItemOptions[1].totalCount || 1);
            this.getGlobalStore().setState('secondOptionLabel', this.state.vendorItemOptions[1].label);
        }

        return deferred.resolve();
    }

    resetLeafOption(options) {
        this.setState('secondOption', options);
    }
    getOptionCount() {
        return this.getState('optionCount');
    }
}

module.exports = OptionList;
