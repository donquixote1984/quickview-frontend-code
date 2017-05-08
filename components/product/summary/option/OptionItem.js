const $ = require('jquery');

const template = require('./OptionItem.hbs');
const dropdownTemplate = require('./OptionDropdownItem.hbs');
const validationUtils = require('common/utils/validationUtils');

const request = require('base/Request');
const LogUtils = require('base/LogUtils');
const Component = require('base/Component');

class OptionItem extends Component {

    name = 'OptionItem'; //eslint-disable-line

    constructor(args) {
        super({ ...args, template });

        this.getGlobalStore().watch('blur', (indexExclude) => {
            /**
             * if indexExclude == -1 or null,  just collapse all the dropdown
             * DO NOT check with if(indexExclude), because indexExclude==0 means do not collapse the first option
             * */
            if (indexExclude !== this.getState('index')) {
                this.setState('collapsed', false);
            }
        });
        this.watch('collapsed', (isCollapsed) => {
            const optionItem = this.container.find('.quick-view-option-item');
            isCollapsed ? optionItem.addClass('collapsed') : optionItem.removeClass('collapsed');

            if (isCollapsed) {
                this.getGlobalStore().broadcast('blur', this.getState('index'));
                if (!this.state.nextPageUrl) {
                    return;
                }
                if (this.state.optionLoaded) {
                    return;
                }
                this.state.optionLoaded = true;
                /**
                 * request 3 page options by default;
                 * */
                this.requestNPageOptions(3);
            }

        });
    }

    beforeConstruct() {
        const deferred = $.Deferred(); //eslint-disable-line
        /**
         * total count information can be only loaded by landing selected option, the following loadOption request will never
         * return this total count attribute.
         * */
        if (this.state.index === 0) {
            this.state.totalCount = this.getGlobalStore().getState('firstOptionCount');
            this.state.label = this.getGlobalStore().getState('firstOptionLabel');
        } else if (this.state.index === 1) {
            /**
             * Here is the tricky point:
             *
             * there is a scenario:
             *       first option changed, and second option total count change , ID: 216650
             *       if first option changed, the second option list will be update , and there indeed IS a not null totalCount,
             *       just use this data to update the totalCount,
             *
             *       But at landing, need to use the landing totalCount;
             *       the first option totalCount never changed after landing.
             *
             *       so, here in the second option , the totalCount should be
             *       this.state.totalCount || globalStore.getState('secondOptionCount')
             *
             *       rather than just globalStore.getState('secondOptionCount')
             * */
            this.state.totalCount = this.state.totalCount || this.getGlobalStore().getState('secondOptionCount');
            this.state.label = this.getGlobalStore().getState('secondOptionLabel');
        }
        this.state.multiple = this.state.totalCount > 1;
        this.setState('optionLoaded', false);
        return deferred.resolve();
    }

    afterConstruct() {

        this.container.find('.multiple').click((e) => {
            e.stopPropagation();
            this.setState('collapsed', !this.getState('collapsed'));
        });

        /**
         * FATAL : option selected !
         * */
        this.container.find('.quick-view-option-dropdown').on('click', '.quick-view-option-dropdown-item', (e) => {
            e.stopPropagation();

            /**
             * send log
             * */
            LogUtils.click().url('/click_option_on_quick_vew_pop_up').param({sourceType: this.getGlobalStore().getState('sourceType')}).send();

            /**
             * current selected node;
             * */
            const target = $(e.currentTarget);
            /**
             * current selected option index
             * */
            const index = target.data('index');
            const optionId = target.data('optionId');
            /**
             * defense logic : forbid out of array;
             * */
            if (index >= this.state.optionItems.length) {
                /**
                 * just close the current dropdown
                 * */
                this.setState('collapsed', false);
                return;
            }
            /**
             * get current selected data
             *
             *
             * if there is 2 options and only click the first option can not directly get the selectedData.
             * should use another request to get the second options's selected data. the same as sdp
             *
             * */
            const selectedDataResult = $.grep(this.state.optionItems, function(obj) {//eslint-disable-line
                /**
                 * MUST use $.grep instead of Array.prototype.find,  ie edge does not support
                 * MUST use == , obj.optionId is a str
                 * */
                 return obj.optionId == optionId; //eslint-disable-line
            });
            const selectedData = selectedDataResult[0];

            if (!selectedData) {
                /**
                 * just close the current dropdown
                 * */
                this.setState('collapsed', false);
                return;
            }

            /**
             * highlight the selected option
             * */
            this.container.find('.quick-view-option-dropdown-item').removeClass('selected');
            target.addClass('selected');

            this.optionChange(selectedData);
            this.setState('collapsed', false);

        });
        /**
         * scroll based option pagination !
         * */
        this.container.find('.quick-view-option-dropdown').on('scroll', (e) => {
            e.stopPropagation();
            if (validationUtils.isEmpty(this.state.nextPageUrl)) {
                return;
            }
            if (this.state.loading) {
                return;
            }
            /**
             * request one page option
             * */
            this.requestNPageOptions(1);

        });
    }

    /**
     * FATAL : option change handler!
     * */
    optionChange(optionData) {
        /**
         * change state of 'selectedOption' component and refresh
         * */
        this.setState('selectedOption', optionData);
        /**
         * close the current dropdown
         * */
        this.setState('collapsed', false);

        /**
         * tell the parent OptionList component to update the last option
         * if 2 options , the second option will be updated.
         * if 1 option, the parent component just broadcast the event
         * */

        if (!this.state.leaf) {
            request(optionData.requestUri)
                .speedChecker({ key: this.getGlobalStore().getState('productId'), contents: 'pagedOptions'})
                .speedCheckerRender(this.container)
                .then(secondOptions => {

                this.parent.resetLeafOption(secondOptions);
                /**
                 * publish the event for the subscribed components
                 * */

                /**
                 * used in header title refresh
                 * */
                this.getGlobalStore().setState('firstSelectedOption', optionData);
                this.getGlobalStore().setState('secondSelectedOption', secondOptions.selectedOption);
                this.getGlobalStore().broadcast('optionChanged', secondOptions.selectedOption);

            });
        } else {
            /**
             * used in header title refresh
             * */

            /**
             * if it is leaf, maybe first option ,may be second option
             * use option count to determine
             * */
            if (this.getOptionCount() === 1) {
                this.getGlobalStore().setState('firstSelectedOption', optionData);
            } else {
                this.getGlobalStore().setState('secondSelectedOption', optionData);
            }
            this.getGlobalStore().broadcast('optionChanged', optionData);
        }
    }

    requestNPageOptions(n) {
        /**
         * chain the request in ugly way, y not using $q
         * */
        this.state.loading = true;
        let q = $.Deferred(); //eslint-disable-line
        let _q = q;
        for (let i = 0; i < n; i++) {
            _q = _q.then(() => this.requestNextPageOptions());
        }
        _q.then(() => { this.state.loading = false; });
        q.resolve();
    }
    requestNextPageOptions() {
        let deferred = $.Deferred(); //eslint-disable-line
        if (validationUtils.isEmpty(this.state.nextPageUrl)) {
            deferred.resolve();
        }
        /** preload next 3 pages if there is next page url*/
        if (this.state.selectedOption.optionId) {
            const paramStartWith = this.state.nextPageUrl.indexOf('?') > 0 ? '&' : '?';
            this.state.nextPageUrl += paramStartWith+'selectedOptionId='+this.state.selectedOption.optionId;//eslint-disable-line
        }
        /**
         * speed checker code start
         * */

        const attributeSpeedCheckParam = {
            page: 'SDP',
            type: 'brandSDP',
            method: 'async',
            keyName: 'productId',
            key: this.getGlobalStore().getState('productId'),
            contents: 'pagedOptions'
        };

        const speedChecker = new SpeedChecker(attributeSpeedCheckParam);
        speedChecker.startServer();
        /**
         * speed checker code end
         * */
        /**
         *  A generator can solve this gracefully , but here we can not use generator* !  babel-polyfill may enlarge the bundle js.
         *  this.requestGenerator = this.request3PagesOptions();
         *  this.requestGenerator.next();
         */

        $.getJSON(this.state.nextPageUrl).then(data => {
            this.state.nextPageUrl = data.nextPageUrl;
            this.appendOptionItem(data.optionItems);
            deferred.resolve();
        });

        return deferred;
    }

    appendOptionItem(optionItems) {
        if (!$.isArray(optionItems)) {
            return;
        }
        this.state.optionItems.push(...optionItems);
        const optionDropdown = this.container.find('.quick-view-option-dropdown');
        optionItems.forEach(optionItem => {
            optionDropdown.append($(dropdownTemplate(optionItem)));
        });
    }

    getOptionCount() {
        return this.parent.getOptionCount();
    }
    /**
    *request3PagesOptions(){

        for(let i = 0 ;i< 3;i++){
            let resultOption = yield (fetch(this.state.nextPageUrl).then(response=>response.json().then(data=>{
                this.requestGenerator.next(data);
            })));
            this.state.nextPageUrl = resultOption.nextPageUrl;
            let paramStartWith = this.state.nextPageUrl.indexOf('?')>0?'&':'?'
            this.state.nextPageUrl+= paramStartWith+'selectedOptionId='+this.state.selectedOption.optionId;

        }
    }*/
}

module.exports = OptionItem;
