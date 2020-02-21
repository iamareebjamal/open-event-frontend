// Types for compiled templates
declare module 'open-event-frontend/templates/*' {
  import { TemplateFactory } from 'htmlbars-inline-precompile';
  const tmpl: TemplateFactory;
  export default tmpl;
}

export class Fastboot {
  isFastboot: boolean;
}

declare module '@ember/service' {
  interface Registry {
    fastboot: Fastboot;
  }
}
