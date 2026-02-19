import { GenericMap } from '../models/GenericMap.ts';
import { TemplateFile } from '../models/TemplateFile.ts';

export default class DataService {
  private static instance: DataService;
  private areaValueMap?: GenericMap;
  private valueChallengeMap?: GenericMap;

  private baseUrl =
    typeof document !== 'undefined' && document.baseURI
      ? new URL('./data/', document.baseURI).toString()
      : './data/';

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  public async getAreaValueMap(): Promise<GenericMap> {
    if (this.areaValueMap) {
      return this.areaValueMap;
    }
    try {
      const res = await fetch(`${this.baseUrl}maps/area-value-map.json`);
      this.areaValueMap = await (res.json() as Promise<GenericMap>);
      return this.areaValueMap;
    } catch (err) {
      console.error('Error fetching area-value map:', err);
      return {};
    }
  }

  public async getValueChallengeMap(): Promise<GenericMap> {
    if (this.valueChallengeMap) {
      return this.valueChallengeMap;
    }
    try {
      const res = await fetch(`${this.baseUrl}maps/value-challenge-map.json`);
      this.valueChallengeMap = await (res.json() as Promise<GenericMap>);
      return this.valueChallengeMap;
    } catch (err) {
      console.error('Error fetching value challenge map:', err);
      return {};
    }
  }

  public async getTemplateFile(): Promise<TemplateFile | null> {
    try {
      const res = await fetch(`${this.baseUrl}templates/template.json`);
      return await (res.json() as Promise<TemplateFile>);
    } catch (err) {
      console.error('Error fetching template file:', err);
      return null;
    }
  }
}
