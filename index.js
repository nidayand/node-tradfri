'use strict';

var isUndefined = require('lodash/isUndefined');
var coapClient = require('./lib/coap-client.js');
var RSVP = require('rsvp');

var transformRawDeviceData = require('./lib/data-transformers').transformRawDeviceData;

var transformRawGroupData = require('./lib/data-transformers').transformRawGroupData;

var transformIdentityData = require('./lib/data-transformers').transformIdentityData;

class Tradfri {
  constructor(config) {
    this.coapClient = coapClient.create(config);
  }

  register(){
    var self = this;
    var promise = new RSVP.Promise((resolve, reject) => {
      self.coapClient.register().then((r) => {
        try {
          resolve(transformIdentityData(r));
        } catch (err) {
          reject('Failed to get preshared key');
        }
      }).catch((err) => {
        reject(err);
      });
    });
    return promise;
  }
  setPresharedKey(key){
    return this.coapClient.setPresharedKey(key);
  }

  getDeviceIds() {
    return this.coapClient.getDevices();
  }

  getGroupIds() {
    return this.coapClient.getGroups();
  }

  getDevices(inputIds) {
    var self = this;
    var pId = [];
    var promise = new RSVP.Promise((resolve, reject) => {
      if (inputIds !== undefined) {
        // An array with device ids is received
        inputIds.forEach((id) => {
          pId.push(self.getDevice(id));
        });
        // Check when all are done
        RSVP.all(pId).then((rawdevices) => {
          resolve(rawdevices);
        }).catch((err) => {
          reject(err);
        });
      } else {
        // No input, get all devices
        self.getDeviceIds().then((ids) => {
          // Create array of promises to get all details
          pId = [];
          ids.forEach((id) => {
            pId.push(self.getDevice(id));
          });

          // Check when all are done
          RSVP.all(pId).then((rawdevices) => {
            resolve(rawdevices);
          }).catch((err) => {
            reject(err);
          });
        }).catch((err) => {
          reject(err);
        });
      }
    });

    return promise;
  }

  getDevice(id) {
    var self = this;
    var promise = new RSVP.Promise((resolve, reject) => {
      self.coapClient.getDevices(id).then((r) => {
        try {
          resolve(transformRawDeviceData(r));
        } catch (err) {
          reject('Failed to convert raw device data');
        }
      }).catch((err) => {
        reject(err);
      });
    });
    return promise;
  }

  getGroups() {
    var self = this;

    var promise = new RSVP.Promise((resolve, reject) => {
      self.getGroupIds().then((ids) => {
        // Create array of promises to get all details
        var pId = [];
        ids.forEach((id) => {
          pId.push(self.getGroup(id));
        });
        // Check when all are done
        RSVP.all(pId).then((rawgroups) => {
          resolve(rawgroups);
        }).catch((err) => {
          reject(err);
        });
      }).catch((err) => {
        reject(err);
      });
    });
    return promise;
  }

  getGroup(id) {
    var self = this;
    var promise = new RSVP.Promise((resolve, reject) => {
      self.coapClient.getGroups(id).then((r) => {
        try {
          resolve(transformRawGroupData(r));
        } catch (err) {
          reject('Failed to convert raw group data');
        }
      }).catch((err) => {
        reject(err);
      });
    });
    return promise;
  }

  getAll() {
    var self = this;

    var promise = new RSVP.Promise((resolve, reject) => {
      var result = [];
      self.getGroups().then((groups) => {
        var pdevices = [];
        groups.forEach((group) => {
          pdevices.push(self.getDevices(group.devices));
        });
        RSVP.all(pdevices).then((devices) => {
          for (var i = 0; i < devices.length; i++) {
            result.push(groups[i]);
            result[i].devices = devices[i];
          }
          resolve(result);
        }).catch((err) => {
          reject(err);
        });
      }).catch((err) => {
        reject(err);
      });
    });
    return promise;
  }

  turnOnDevice(deviceId) {
    return this.coapClient.operate('device', deviceId, {
      state: 'on'
    });
  }

  turnOffDevice(deviceId) {
    return this.coapClient.operate('device', deviceId, {
      state: 'off'
    });
  }

  toggleDevice(deviceId, state) {
    var self = this;

    var promise = new RSVP.Promise((resolve, reject) => {
      self.getDevice(deviceId).then((device) => {
        if (isUndefined(state)) {
          if (device.on) {
            return this.turnOffDevice(deviceId);
          }
          return this.turnOnDevice(deviceId);
        }

        if (state) {
          return this.turnOnDevice(deviceId);
        }

        return this.turnOffDevice(deviceId);
      }).catch((err) => {
        reject(err);
      });
    });

    return promise;
  }

  setDeviceState(deviceId, properties) {

    if (properties.state === 'toggle') {
      var self = this;
      var promise = new RSVP.Promise((resolve, reject) => {
        self.getDevice(deviceId).then((device) => {
          if (device.on) {
            properties.state = 'off';
          } else {
            properties.state = 'on';
          }
          return self.coapClient.operate('device', deviceId, properties);
        }).catch((err) => {
          reject(err);
        });
      });

      return promise;
    }

    return this.coapClient.operate('device', deviceId, properties);
  }

  turnOnGroup(groupId) {
    return this.coapClient.operate('group', groupId, {
      state: 'on'
    });
  }

  turnOffGroup(groupId) {
    return this.coapClient.operate('group', groupId, {
      state: 'off'
    });
  }

  toggleGroup(groupId, state) {
    var self = this;

    var promise = new RSVP.Promise((resolve, reject) => {
      self.getGroup(groupId).then((group) => {
        if (isUndefined(state)) {
          if (group.on) {
            return this.turnOffGroup(groupId);
          }
          return this.turnOnGroup(groupId);
        }

        if (state) {
          return this.turnOnGroup(groupId);
        }

        return this.turnOffGroup(groupId);
      }).catch((err) => {
        reject(err);
      });
    });

    return promise;
  }

  setGroupState(groupId, properties) {
      if (properties.state === 'toggle') {
      var self = this;
      var promise = new RSVP.Promise((resolve, reject) => {
        self.getGroup(groupId).then((group) => {
          if (group.on) {
            properties.state = 'off';
          } else {
            properties.state = 'on';
          }
          return this.coapClient.operate('group', groupId, properties);
        }).catch((err) => {
          reject(err);
        });
      });

      return promise;
    }

    return this.coapClient.operate('group', groupId, properties);
  }

  static create(config) {
    return new Tradfri(config);
  }
}

module.exports = Tradfri;
