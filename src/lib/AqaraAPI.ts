import * as crypto from 'crypto';

import axios, {AxiosInstance, AxiosRequestConfig} from 'axios';
import {askQuestion} from './help';

export enum Region {
  cn,
  us,
  kr,
  ru,
  de,
  sg
}

export enum Language {
  en = 'en',
  zh = 'zh',
}

export class Options {
  constructor(
    public region: Region = Region.cn,
    public version: string = 'v3.0',
    public lang: Language = Language.en,
    public appId: string,
    public keyId: string,
    public appKey: string,
  ) {
  }
}

/**
 * Generate a sign value based on the inputs.
 * @param {string} accessToken - The access token.
 * @param {string} appId - The app ID.
 * @param {string} keyId - The key ID.
 * @param {string} nonce - A random nonce string.
 * @param {string} time - The timestamp.
 * @param {string} appKey - The app key.
 * @returns {string} The generated sign value or null in case of an error.
 */
function createSign(appId: string, keyId: string, nonce: string, time: string, appKey: string, accessToken?: string): string {
  let sb = '';
  if (accessToken && accessToken.trim() !== '') {
    sb += `Accesstoken=${accessToken}&`;
  }
  sb += `Appid=${appId}&Keyid=${keyId}&Nonce=${nonce}&Time=${time}${appKey}`;

  const signStr = sb.toLowerCase();

  return md5(signStr);
}

/**
 * Generate the MD5 hash of a string.
 * @param {string} sourceStr - The input string.
 * @returns {string} The MD5 hash in hexadecimal format.
 */
function md5(sourceStr: string): string {
  return crypto.createHash('md5').update(sourceStr, 'utf-8').digest('hex');
}

let instance: AqaraAPI;

export class AqaraAPI {

  private _accessToken: string | undefined;
  private _refreshToken: string | undefined;

  private _client: AxiosInstance;

  constructor(private _options: Options) {
    this._client = axios.create({
      baseURL: this.url,
    });
  }

  public get apiDomain() {
    switch (this._options.region) {
      case Region.kr:
        return 'open-kr.aqara.com';
      case Region.de:
        return 'open-ger.aqara.com';
      case Region.ru:
        return 'open-ru.aqara.com';
      case Region.sg:
        return 'open-sg.aqara.com';
      case Region.us:
        return 'open-usa.aqara.com';
      default:
        return 'open-cn.aqara.com';
    }
  }

  public get deviceSDKDomain() {
    switch (this._options.region) {
      case Region.kr:
        return 'coap-kr.aqara.com';
      case Region.de:
        return 'coap-ger.aqara.com';
      case Region.ru:
        return 'coap-ru.aqara.com';
      case Region.sg:
        return 'coap-sg.aqara.com';
      case Region.us:
        return 'aiot-coap-usa.aqara.com';
      default:
        return 'aiot-coap.aqara.cn';
    }
  }

  get url() {
    return `https://${this.apiDomain}/${this._options.version}/open/api`;
  }

  private _buildConfig() {

    const nonce = crypto.randomUUID();
    const time = Date.now().toString();

    const headers: { [key: string]: string } = {
      'Appid': this._options.appId,
      'Keyid': this._options.keyId,
      'Nonce': nonce,
      'Sign' : createSign(
        this._options.appId,
        this._options.keyId,
        nonce,
        time,
        this._options.appKey,
        this._accessToken,
      ),
      'Lang' : this._options.lang,
      'Time' : time,
    };

    if (this._accessToken) {
      headers['Accesstoken'] = this._accessToken;
    }

    const config: AxiosRequestConfig = {
      headers,
    };

    return config;
  }

  private _buildData(intent: string, data: any) {
    return {
      intent,
      data,
    };
  }

  public getAuthCode(account: string, accessTokenValidity = '10y') {
    return this.call('config.auth.getAuthCode', {
      account,
      accountType: 0,
      accessTokenValidity,
    });
  }

  public getToken(account: string, authCode: string) {
    return this.call('config.auth.getToken', {
      account,
      accountType: 0,
      authCode,
    });
  }

  public call(intent: string, data: any) {
    return this._client.post('', this._buildData(intent, data), this._buildConfig()).then((res) => {
      if (res.data.code === 0) {
        return res.data;
      }

      throw new Error(JSON.stringify(res.data));
    });
  }

  public authenticate(account: string, accessTokenValidity = '10y') {
    return this.getAuthCode(account, accessTokenValidity)
      .then(res => {
        return askQuestion('Enter Aqara authentication code: ');

      }, (e) => {
        throw new Error('Authentication failed: ' + e.message);
      })
      .then(authCode => {
        return this.getToken(account, authCode);
      })
      .then(data => {
        this._accessToken = data.result.accessToken;
        this._refreshToken = data.result.refreshToken;

        return {
          accessToken : data.result.accessToken,
          refreshToken: data.result.refreshToken,
        };
      }, (e) => {
        throw new Error('Authentication failed: ' + e.message);
      });
  }

  set accessToken(accessToken: string | undefined) {
    this._accessToken = accessToken;
  }

  get accessToken(): string | undefined {
    return this._accessToken;
  }

  set refreshToken(refreshToken: string) {
    this._refreshToken = refreshToken;
  }

  get options(): Options {
    return this._options;
  }

  public static factory(options: Options, forceRecreate = false) {
    if (instance && !forceRecreate) {
      return instance;
    }

    return instance = new AqaraAPI(options);
  }
}
