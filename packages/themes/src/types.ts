export type SectionNode = {
  type: string;
  id: string;
  props: Record<string, unknown>;
  style?: Record<string, unknown>;
};

export type ContentV1 = {
  schema_version: 1;
  section_order: string[];
  sections: Record<string, SectionNode>;
};

export type ThemePackageManifest = {
  code: string;
  name: string;
  version: string;
  supports: string[];
  layouts: Record<string, string[]>;
  demo_fixtures?: Record<string, string>;
  compatible_app_blocks?: string[];
};

export type ThemePackage = {
  manifest: ThemePackageManifest;
  starter: {
    home: ContentV1;
    tokens: Record<string, string>;
  };
};
