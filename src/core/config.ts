// Configuration interface

import { Breakpoint } from './types';
import { StorageAdapter } from '../adapters/storage';
import { ComponentRegistry } from '../adapters/components';
import { PageData } from './types';

export interface PageBuilderConfig<T extends string = string> {
  // Grid settings
  gridSize?: number;
  
  // Breakpoint widths
  breakpoints?: Record<Breakpoint, number>;
  
  // Canvas settings
  defaultCanvasHeight?: number;
  
  // Storage adapter
  storage?: StorageAdapter;
  
  // Component registry
  components?: ComponentRegistry<T>;
  
  // Callbacks
  onSave?: (data: PageData<T>) => void;
  onElementSelect?: (elementId: string | null) => void;
  onElementUpdate?: (elementId: string, updates: any) => void;
  
  // Auto-save settings
  autoSaveDelay?: number; // milliseconds
  
  // History settings
  maxHistorySize?: number; // Maximum number of undo/redo steps (default: 50)
}

export const defaultConfig: Required<Omit<PageBuilderConfig, 'storage' | 'components' | 'onSave' | 'onElementSelect' | 'onElementUpdate'>> = {
  gridSize: 50,
  breakpoints: {
    desktop: 1200,
    tablet: 768,
    mobile: 375,
  },
  defaultCanvasHeight: 800,
  autoSaveDelay: 3000,
};
