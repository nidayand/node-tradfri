'use strict';

const isUndefined = require('lodash/isUndefined');

class CoapCommandBuilder {
    constructor(coapClientPath, securityId, hubIpAddress, identity, preshared_key) {
        this.coapClientPath = coapClientPath;
        this.securityId = securityId;
        this.ip = hubIpAddress;
        this.identity = identity;
        this.preshared_key = preshared_key;
    }

    register() {
        const command = `${this.coapClientPath} -m post -u "Client_identity" -k "${this.securityId}" -e '{"9090":"`+this.identity+`"}' "coaps://${this.ip}:5684/15011/9063"`;

        return command;
    }
    setPresharedKey(key){
      this.preshared_key = key;
    }

    get(type, id) {
        const endpoint = type === 'device' ? 15001 : 15004;
        let command = `${this.coapClientPath} -m get -u "${this.identity}" -k "${this.preshared_key}" "coaps://${this.ip}:5684/${endpoint}`;

        if (id) {
            command += `/${id}"`;
        } else {
            command += '"';
        }

        return command;
    }

    put(type, id, operation) {
        const endpoint = type === 'device' ? 15001 : 15004;

        const modifier = {};
        if (!isUndefined(operation.state)) {
            if (operation.state === 'on' || operation.state === 1 || operation.state === true) {
                modifier[5850] = 1;
            } else {
                modifier[5850] = 0;
            }
        }

        if (!isUndefined(operation.transitionTime)) {
            modifier[5712] = operation.transitionTime;
        }

        if (type === 'device' && !isUndefined(operation.color)) {
            let color = operation.color.toLowerCase();
            switch (color) {
            case 'focus':    case 'cool':   color = 'f5faf6'; break;
            case 'everyday': case 'normal': color = 'f1e0b5'; break;
            case 'relax':    case 'warm':   color = 'efd275'; break;
            default:
                if ( ! color.match('/^[0-9a-f]{6}$/'))
                    color = undefined;
            }

            if (color) modifier[5706] = color;
        }

        if (!isUndefined(operation.brightness)) {
            modifier[5851] = operation.brightness;
        }

        let e = '';
        if (type === 'device') {
            e = `'{"3311":[${JSON.stringify(modifier)}]}'`;
        } else {
            e = `'${JSON.stringify(modifier)}'`;
        }

        const command = `${this.coapClientPath} -m put -u "${this.identity}" -k "${this.preshared_key}" -e ${e} "coaps://${this.ip}:5684/${endpoint}/${id}"`;

        return command;
    }

    static create(coapClientPath, securityId, hubIpAddress) {
        return new CoapCommandBuilder(coapClientPath, securityId, hubIpAddress);
    }
}

module.exports = CoapCommandBuilder;
