import {PLATFORM_NAME, PLUGIN_NAME} from './settings';

import {
  API,
  APIEvent,
  Categories,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformAccessoryEvent,
  PlatformConfig,
  UnknownContext,
} from 'homebridge';

import {IrACAccessory} from './accessories';
import {AqaraAPI} from './lib/AqaraAPI';

export class AqaraIrControllerPlatform implements DynamicPlatformPlugin {

  private _accessories: { [key: string]: PlatformAccessory } = {};

  private _aqara: AqaraAPI;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this._aqara = AqaraAPI.factory({
      region : config.region,
      lang   : config.lang,
      appId  : config.appId,
      keyId  : config.keyId,
      appKey : config.appKey,
      version: config.version,
    });

    this._aqara.accessToken = config.accessToken && config.accessToken.length ? config.accessToken : undefined;
    this._aqara.refreshToken = config.refreshToken && config.refreshToken.length ? config.refreshToken : undefined;

    this.api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
      this.log.debug('Executed didFinishLaunching callback');

      this.discoverDevices();
    });
  }

  public get aqara(): AqaraAPI {
    return this._aqara;
  }

  discoverDevices() {
    const irAC: any[] = [];

    if (this.aqara.accessToken) {
      const filter = {};
      if (this.config && this.config.positionId && this.config.positionId.length) {
        filter['positionId'] = this.config.positionId;
      }

      this._aqara.call('query.device.info', filter)
        .then(data => {
          data.result.data.forEach((device: any) => {
            if (device.model === 'virtual.ir.ac') {
              irAC.push(device);
            }
          });
        }, (err) => {
          this.log.debug(err.message);
        })
        .then(() => {
          const promises: Promise<any>[] = [];
          irAC.forEach((device) => {
            promises.push(this._aqara.call('query.ir.info', {
              did: device.did,
            }).then(data => {
              device['info'] = data.result;
            }));
            promises.push(this._aqara.call('query.ir.acState', {
              did: device.did,
            }).then(data => {
              device['state'] = data.result;
            }));
          });

          return Promise.all(promises);
        })
        .then((data) => {
          irAC.forEach((device) => {
            this.addAccessory(device.deviceName, Categories.AIR_CONDITIONER, device);
          });
        });
    }
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.log('Configuring accessory %s', accessory.displayName);

    accessory.on(PlatformAccessoryEvent.IDENTIFY, () => {
      this.log('%s identified!', accessory.displayName);
    });

    if (accessory.category === this.api.hap.Categories.AIR_CONDITIONER) {
      new IrACAccessory(this, accessory, accessory.context);
    }

    this._accessories[accessory.UUID] = accessory;
  }

  addAccessory(name: string, category: Categories, config: UnknownContext) {
    const uuid = this.api.hap.uuid.generate(name);

    if (!this._accessories[uuid]) {
      this.log.info('Adding new accessory with name %s', name);

      const accessory = new this.api.platformAccessory(name, uuid, category);

      accessory.context = config;

      this.configureAccessory(accessory); // abusing the configureAccessory here

      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    } else {
      this.log.info('Skipping to add new accessory with name %s because it exists in cache', name);
    }
  }

  removeAccessories(uuids: string[] = []) {
    const found: PlatformAccessory[] = [];

    uuids.forEach((uuid) => {
      if (this._accessories[uuid]) {
        found.push(this._accessories[uuid]);
      }
    });

    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, found);

    found.forEach((accessory: PlatformAccessory) => {
      delete this._accessories[accessory.UUID];
    });
  }
}
