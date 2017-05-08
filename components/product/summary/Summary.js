require('./Summary.scss');
const template = require('./Summary.hbs');

const Component = require('base/Component');
class Summary extends Component {
    name = 'Summary'; //eslint-disable-line
    constructor(args) {
        super({ ...args, template });
    }
}

module.exports = Summary;
