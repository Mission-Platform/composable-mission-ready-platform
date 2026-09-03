import { storyblokEditable } from "@storyblok/js";
import { createComponent, createContext, useContext } from "solid-js";
import { Dynamic } from "solid-js/web";

import type { SbBlokData } from "@storyblok/js";
import type { JSX } from "solid-js";

export type StoryblokComponentType = (properties: {
  blok: SbBlokData;
}) => JSX.Element;

export type StoryblokComponentRegistry = Readonly<
  Record<string, StoryblokComponentType>
>;

const StoryblokRegistryContext = createContext<StoryblokComponentRegistry>({});

export interface StoryblokProviderProperties {
  components: StoryblokComponentRegistry;
  children?: JSX.Element;
}

export function StoryblokProvider(
  properties: StoryblokProviderProperties,
): JSX.Element {
  return createComponent(StoryblokRegistryContext.Provider, {
    value: properties.components,
    get children() {
      return properties.children;
    },
  });
}

export interface StoryblokComponentProperties {
  blok: SbBlokData;
}

export function StoryblokComponent(
  properties: StoryblokComponentProperties,
): JSX.Element {
  const registry = useContext(StoryblokRegistryContext);
  const component = registry[properties.blok.component];
  if (component === undefined) {
    return createComponent(Dynamic, {
      component: "div",
      ...storyblokEditable(properties.blok),
      "data-storyblok-missing-component": properties.blok.component,
      children: `Missing Storyblok component: ${properties.blok.component}`,
    });
  }
  return createComponent(component, { blok: properties.blok });
}
