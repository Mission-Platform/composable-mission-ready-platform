export type MermaidThemeVariables = Record<string, string>;

/** CSS custom-property values shared by Mermaid's generated diagram selectors. */
export const mermaidThemeVariables: Readonly<MermaidThemeVariables> = Object.freeze({
  background: 'var(--mp-color-bg-sunken)',
  mainBkg: 'var(--mp-color-bg-surface)',
  secondBkg: 'var(--mp-color-bg-muted)',
  tertiaryBkg: 'var(--mp-color-bg-raised)',
  primaryColor: 'var(--mp-color-primary-subtle)',
  primaryTextColor: 'var(--mp-color-primary-text)',
  primaryBorderColor: 'var(--mp-color-primary-default)',
  secondaryColor: 'var(--mp-color-bg-muted)',
  secondaryTextColor: 'var(--mp-color-text-primary)',
  secondaryBorderColor: 'var(--mp-color-border-default)',
  tertiaryColor: 'var(--mp-color-bg-muted)',
  tertiaryTextColor: 'var(--mp-color-text-primary)',
  tertiaryBorderColor: 'var(--mp-color-border-default)',
  lineColor: 'var(--mp-color-text-secondary)',
  textColor: 'var(--mp-color-text-primary)',
  border1: 'var(--mp-color-border-default)',
  border2: 'var(--mp-color-border-strong)',
  titleColor: 'var(--mp-color-text-primary)',
  edgeLabelBackground: 'var(--mp-color-bg-surface)',
  nodeBkg: 'var(--mp-color-primary-subtle)',
  nodeBorder: 'var(--mp-color-primary-default)',
  nodeTextColor: 'var(--mp-color-primary-text)',
  clusterBkg: 'var(--mp-color-bg-muted)',
  clusterBorder: 'var(--mp-color-border-default)',
  defaultLinkColor: 'var(--mp-color-text-secondary)',
  actorBkg: 'var(--mp-color-bg-surface)',
  actorBorder: 'var(--mp-color-border-default)',
  actorTextColor: 'var(--mp-color-text-primary)',
  actorLineColor: 'var(--mp-color-text-secondary)',
  signalColor: 'var(--mp-color-text-secondary)',
  signalTextColor: 'var(--mp-color-text-primary)',
  labelBoxBkgColor: 'var(--mp-color-bg-surface)',
  labelBoxBorderColor: 'var(--mp-color-border-default)',
  labelTextColor: 'var(--mp-color-text-primary)',
  loopTextColor: 'var(--mp-color-text-primary)',
  activationBorderColor: 'var(--mp-color-primary-default)',
  activationBkgColor: 'var(--mp-color-primary-subtle)',
  sequenceNumberColor: 'var(--mp-color-primary-text)',
  noteBkgColor: 'var(--mp-color-warning-subtle)',
  noteTextColor: 'var(--mp-color-warning-text)',
  noteBorderColor: 'var(--mp-color-warning-default)',
  sectionBkgColor: 'var(--mp-color-bg-muted)',
  altSectionBkgColor: 'var(--mp-color-bg-surface)',
  gridColor: 'var(--mp-color-border-default)',
  classBkg: 'var(--mp-color-primary-subtle)',
  classText: 'var(--mp-color-primary-text)',
  classBorder: 'var(--mp-color-primary-default)',
  cScale0: 'var(--mp-color-primary-subtle)',
  cScale1: 'var(--mp-color-success-subtle)',
  cScale2: 'var(--mp-color-warning-subtle)',
  cScale3: 'var(--mp-color-danger-subtle)',
  cScale4: 'var(--mp-color-info-subtle)',
  cScaleLabel0: 'var(--mp-color-primary-text)',
  cScaleLabel1: 'var(--mp-color-success-text)',
  cScaleLabel2: 'var(--mp-color-warning-text)',
  cScaleLabel3: 'var(--mp-color-danger-text)',
  cScaleLabel4: 'var(--mp-color-info-text)',
  successBorderColor: 'var(--mp-color-success-default)',
  warningBorderColor: 'var(--mp-color-warning-default)',
  dangerBorderColor: 'var(--mp-color-danger-default)',
  infoBorderColor: 'var(--mp-color-info-default)',
});

export type MermaidThemeCSS = string;

export const mermaidThemeCSS: MermaidThemeCSS = `
  .root {
    background-color: ${mermaidThemeVariables.background};
  }

  .node rect,
  .node circle,
  .node ellipse,
  .node polygon,
  .node path {
    fill: ${mermaidThemeVariables.nodeBkg};
    stroke: ${mermaidThemeVariables.nodeBorder};
  }

  .node .label,
  .nodeLabel,
  .label text,
  .node text,
  .node tspan {
    color: ${mermaidThemeVariables.nodeTextColor};
    fill: ${mermaidThemeVariables.nodeTextColor};
  }

  .edgePath .path,
  .flowchart-link,
  .messageLine0,
  .messageLine1,
  .actor-line,
  .loopLine {
    stroke: ${mermaidThemeVariables.lineColor};
  }

  .edgeLabel rect,
  .edgeLabel,
  .labelBox {
    fill: ${mermaidThemeVariables.edgeLabelBackground};
    background-color: ${mermaidThemeVariables.edgeLabelBackground};
  }

  .edgeLabel text,
  .edgeLabel tspan,
  .messageText,
  .signalText {
    color: ${mermaidThemeVariables.textColor};
    fill: ${mermaidThemeVariables.textColor};
  }

  .cluster rect {
    fill: ${mermaidThemeVariables.clusterBkg};
    stroke: ${mermaidThemeVariables.clusterBorder};
  }

  .cluster-label text,
  .cluster span,
  .titleText,
  .sectionTitle {
    color: ${mermaidThemeVariables.titleColor};
    fill: ${mermaidThemeVariables.titleColor};
  }

  .actor rect,
  .labelBox,
  .note,
  .activation0,
  .activation1,
  .activation2 {
    fill: ${mermaidThemeVariables.actorBkg};
    stroke: ${mermaidThemeVariables.actorBorder};
  }

  .actor text,
  .actor tspan,
  .labelText,
  .loopText,
  .noteText,
  .sequenceNumber {
    color: ${mermaidThemeVariables.actorTextColor};
    fill: ${mermaidThemeVariables.actorTextColor};
  }

  .note {
    fill: ${mermaidThemeVariables.noteBkgColor};
    stroke: ${mermaidThemeVariables.noteBorderColor};
  }

  .noteText,
  .noteText tspan {
    color: ${mermaidThemeVariables.noteTextColor};
    fill: ${mermaidThemeVariables.noteTextColor};
  }

  .node.primary rect,
  .node.primary circle,
  .node.primary ellipse,
  .node.primary polygon {
    fill: ${mermaidThemeVariables.cScale0};
    stroke: ${mermaidThemeVariables.primaryBorderColor};
  }

  .node.success rect,
  .node.success circle,
  .node.success ellipse,
  .node.success polygon {
    fill: ${mermaidThemeVariables.cScale1};
    stroke: ${mermaidThemeVariables.successBorderColor};
  }

  .node.warning rect,
  .node.warning circle,
  .node.warning ellipse,
  .node.warning polygon {
    fill: ${mermaidThemeVariables.cScale2};
    stroke: ${mermaidThemeVariables.warningBorderColor};
  }

  .node.danger rect,
  .node.danger circle,
  .node.danger ellipse,
  .node.danger polygon {
    fill: ${mermaidThemeVariables.cScale3};
    stroke: ${mermaidThemeVariables.dangerBorderColor};
  }

  .node.info rect,
  .node.info circle,
  .node.info ellipse,
  .node.info polygon {
    fill: ${mermaidThemeVariables.cScale4};
    stroke: ${mermaidThemeVariables.infoBorderColor};
  }

  .node.primary .label,
  .node.primary text,
  .node.primary tspan {
    color: ${mermaidThemeVariables.cScaleLabel0};
    fill: ${mermaidThemeVariables.cScaleLabel0};
  }

  .node.success .label,
  .node.success text,
  .node.success tspan {
    color: ${mermaidThemeVariables.cScaleLabel1};
    fill: ${mermaidThemeVariables.cScaleLabel1};
  }

  .node.warning .label,
  .node.warning text,
  .node.warning tspan {
    color: ${mermaidThemeVariables.cScaleLabel2};
    fill: ${mermaidThemeVariables.cScaleLabel2};
  }

  .node.danger .label,
  .node.danger text,
  .node.danger tspan {
    color: ${mermaidThemeVariables.cScaleLabel3};
    fill: ${mermaidThemeVariables.cScaleLabel3};
  }

  .node.info .label,
  .node.info text,
  .node.info tspan {
    color: ${mermaidThemeVariables.cScaleLabel4};
    fill: ${mermaidThemeVariables.cScaleLabel4};
  }
`;
