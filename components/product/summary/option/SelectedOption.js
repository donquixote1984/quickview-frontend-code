const template = require('./SelectedOption.hbs');

const Component = require('base/Component');

class SelectedOption extends Component {
    constructor(args) {
        super({...args, template});
    }
}

module.exports = SelectedOption;
