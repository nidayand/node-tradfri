'use strict';

const exec = require('child_process').exec;
const CoapCommandBuilder = require('./command-builder');
const throttler = require('p-throttler').create(15, {
    'makeRequest': 1
});

class CoapClient {
    constructor(config) {
        this.commandBuilder = new CoapCommandBuilder(config.coapClientPath, config.securityId, config.hubIpAddress, config.identity, config.preshared_key);
        this.identity = config.identity;
    }

    register(){
        const command = this.commandBuilder.register(this.identity);
        return this.constructor.makeRequestQueue(command);
    }
    setPresharedKey(key){
      this.commandBuilder.setPresharedKey(key);
    }

    getDevices(deviceId) {
        const command = this.commandBuilder.get('device', deviceId);
        return this.constructor.makeRequestQueue(command);
    }

    getGroups(groupId) {
        const command = this.commandBuilder.get('group', groupId);
        return this.constructor.makeRequestQueue(command);
    }

    operate(type, id, operation) {
        const command = this.commandBuilder.put(type, id, operation);
        return this.constructor.makeRequestQueue(command, false);
    }

    static makeRequest(command, parseResponse) {
        if (parseResponse == undefined) parseResponse = true;
        return new Promise((resolve, reject) => {
            exec(command, {
                timeout: 5000,
                killSignal: 'SIGKILL'
            }, (err, stdOut) => {
                if (parseResponse) {
                    if (stdOut) {
                        try {
                            resolve(JSON.parse(stdOut.split('\n')[3]));
                        } catch (err) {
                            reject('Invalid response!');
                        }
                    } else {
                        reject('Failed to connect!');
                    }
                } else {
                    resolve({});
                }
            });
        });
    }

    /**
     * Wrapper to makeRequest function and as the C code of coap can only
     * run in singleton the function makes sure to queue all calls so that
     * there will be no conflicts/hangs
     * @param   {string}  command       The coap call
     * @param   {boolean} parseResponse Should the response be parsed
     * @returns {Promise} If successful with the result
     */
    static makeRequestQueue(command, parseResponse) {
        if (parseResponse == undefined) parseResponse = true;
        var self = this;
        var promise = new Promise((resolve, reject) => {
            throttler.enqueue(function () {
                return self.makeRequest(command, parseResponse);
            }, 'makeRequest').then(val => {
                resolve(val);
            }).catch(err => {
                reject(err)
            });;
        });
        return promise;
    }

    static create(config) {
        return new CoapClient(config);
    }
}

module.exports = CoapClient;
