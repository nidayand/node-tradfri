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
        var colorMap = {'focus':'f5faf6','cool':'f5faf6','everyday':'f1e0b5','normal':'f1e0b5','relax':'efd275','warm':'efd275','cold sky':'dcf0f8','cool daylight':'eaf6fb','cool white':'f5faf6','sunrise':'f2eccf','warm white':'f1e0b5','warm glow':'efd275','candlelight':'ebb63e','warm amber':'e78834','peach':'e57345','dark peach':'da5d41','saturated red':'dc4b31','pink':'e491af','light pink':'e8bedd','saturated pink':'d9337c','light purple':'c984bb','saturated purple':'8f2686','blue':'4a418a','light blue':'6c83ba','lime':'a9d62b','yellow':'d6e44b'};

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
            if (color in colorMap) {
                color = colorMap[color];
            } else {
                if (!color.match(/^[0-9a-f]{6}$/))
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
