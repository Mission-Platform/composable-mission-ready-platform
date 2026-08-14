const PACKAGE_GROUPS: Record<string, string> = {
  '@mission-platform/components': 'package-ui',
  '@mission-platform/icons': 'package-ui',
  '@mission-platform/forms': 'package-ui',
  '@mission-platform/content': 'package-ui',
  '@mission-platform/layouts': 'package-ui',
  '@mission-platform/map': 'package-browser-integration',
  '@mission-platform/d3': 'package-browser-integration',
  '@mission-platform/three': 'package-browser-integration',
  '@mission-platform/rxjs': 'package-browser-integration',
  '@mission-platform/resource-planner': 'package-browser-integration',
  '@mission-platform/scheduler': 'package-browser-integration',
  '@mission-platform/observers': 'package-browser-integration',
  '@mission-platform/breakpoints': 'package-browser-integration',
  '@mission-platform/qr-code': 'package-data-codec-email',
  '@mission-platform/matrix-code': 'package-data-codec-email',
  '@mission-platform/barcode': 'package-data-codec-email',
  '@mission-platform/code-scanner': 'package-data-codec-email',
  '@mission-platform/email-components': 'package-data-codec-email',
  '@mission-platform/vcard': 'package-data-codec-email',
};

const APP_GROUPS: Record<string, string> = {
  docs: 'vue-apps',
  website: 'vue-apps',
  'my-care-notes': 'vue-apps',
  'service-monitor': 'redwood-react-apps',
  storybook: 'storybook-ci',
};

export function workstreamForPackage(packageName: string): string {
  return PACKAGE_GROUPS[packageName] ?? `package:${packageName}`;
}

export function workstreamForApp(appName: string): string {
  return APP_GROUPS[appName] ?? `app:${appName}`;
}
