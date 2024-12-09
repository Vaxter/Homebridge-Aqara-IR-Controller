// your class MUST extend the HomebridgePluginUiServer
import {HomebridgePluginUiServer} from '@homebridge/plugin-ui-utils';
import {AqaraAPI} from '../lib/AqaraAPI';
import {readFileSync} from 'fs';

class UiServer extends HomebridgePluginUiServer {

  private _aqara: AqaraAPI | null = null;

  private _config: any;

  constructor() {
    super();

    this._fillConfig();
    this._initAqara();

    this.onRequest('/auth/init', this.authInit.bind(this));
    this.onRequest('/auth/login', this.getTokens.bind(this));
    this.onRequest('/reconfigure', this.reconfigure.bind(this));
    this.onRequest('/aqara/homes', this.getHomes.bind(this));

    this.ready();
  }

  private _initAqara(forceRecreate = false) {
    if (this._config) {
      this._aqara = AqaraAPI.factory({
        region : this._config.region,
        lang   : this._config.lang,
        appId  : this._config.appId,
        keyId  : this._config.keyId,
        appKey : this._config.appKey,
        version: this._config.version,
      }, forceRecreate);

      this._aqara.accessToken = this._config.accessToken;
      this._aqara.refreshToken = this._config.refreshToken;
    }
  }

  private _fillConfig(config = null) {
    if (config) {
      this._config = config;
    } else {
      const readConfig = JSON.parse(readFileSync(this.homebridgeConfigPath as string, 'utf8'));

      readConfig.platforms.forEach(platform => {
        if (platform.platform === 'AqaraIrController') {
          this._config = platform;
        }
      });
    }
  }

  /**
   * Example only.
   * Handle requests made from the UI to the `/hello` endpoint.
   */
  async authInit({username}) {
    if (this._aqara) {
      return this._aqara.getAuthCode(username)
        .then(data => {
          if (data.code === 0) {
            return {
              code: 0,
            };
          }

          throw new Error('Authentication failed');
        });
    }
  }

  async getTokens({username, authCode}) {
    if (this._aqara) {
      return this._aqara.getToken(username, authCode);
    }
  }

  async reconfigure(config) {
    try {
      this._fillConfig(config);
      this._initAqara(true);

      return {
        code: 0,
      };
    } catch (error: any) {
      return {
        code : 1,
        error: error.message,
      };
    }
  }

  async getHomes() {
    if (this._aqara) {
      return this._aqara.call('query.position.info', {
        pageSize: 50,
      });
    }
  }
}

(() => {
  return new UiServer;
})();
