/**
 * PanelSelector – Modal for adding/removing panels
 * 
 * CLEANED: Removed PRO badges and locked features. Only shows working panels.
 * Each panel card shows its data source and description.
 */

import { useState, useMemo, useEffect } from 'react';
import { PANEL_CATEGORIES, ALL_PANELS, type PanelConfig } from '../config/panels';
import { XIcon, CheckIcon, SearchIcon } from '../Icons';

interface PanelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  enabledPanels: Set<string>;
  onTogglePanel: (panelId: string) => void;
  onAddPanel: (panelId: string) => void;
  onSave: () => void;
  onReset: () => void;
}

export function PanelSelector({
  isOpen,
  onClose,
  enabledPanels,
  onTogglePanel,
  onAddPanel,
  onSave,
  onReset,
}: PanelSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter panels by category and search
  const filteredPanels = useMemo(() => {
    let panels = ALL_PANELS;

    // Filter by category
    if (activeCategory !== 'all') {
      panels = panels.filter(p => p.category === activeCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      panels = panels.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        (p.description || '').toLowerCase().includes(query)
      );
    }

    return panels;
  }, [activeCategory, searchQuery]);

  // Count enabled panels per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { enabled: number; total: number }> = {};
    counts['all'] = { enabled: 0, total: ALL_PANELS.length };

    PANEL_CATEGORIES.forEach(cat => {
      const categoryPanels = ALL_PANELS.filter(p => p.category === cat.id);
      counts[cat.id] = {
        enabled: categoryPanels.filter(p => enabledPanels.has(p.id)).length,
        total: categoryPanels.length
      };
    });

    counts['all'].enabled = Array.from(enabledPanels).length;
    return counts;
  }, [enabledPanels]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="panel-selector-overlay" onClick={onClose}>
      <div className="panel-selector-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="panel-selector-header">
          <div className="panel-selector-title">
            <span className="icon">⚙️</span>
            <h2>Configure Panels</h2>
          </div>
          <div className="panel-selector-actions">
            <button className="btn-secondary" onClick={onReset}>
              Reset Layout
            </button>
            <button className="btn-primary" onClick={onSave}>
              Save
            </button>
            <button className="btn-close" onClick={onClose}>
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="panel-selector-search">
          <SearchIcon size={14} />
          <input
            type="text"
            placeholder="Filter panels..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Tabs */}
        <div className="panel-selector-tabs">
          <button
            className={`tab ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All
            <span className="tab-count">{categoryCounts['all'].enabled}/{categoryCounts['all'].total}</span>
          </button>
          {PANEL_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`tab ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span className="tab-icon">{cat.icon}</span>
              {cat.name}
              <span className="tab-count">
                {categoryCounts[cat.id]?.enabled || 0}/{categoryCounts[cat.id]?.total || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Panel Grid */}
        <div className="panel-selector-grid">
          {filteredPanels.map(panel => (
            <PanelCard
              key={panel.id}
              panel={panel}
              isEnabled={enabledPanels.has(panel.id)}
              onToggle={() => onTogglePanel(panel.id)}
              onAdd={() => onAddPanel(panel.id)}
            />
          ))}
          {filteredPanels.length === 0 && (
            <div className="panel-selector-empty">
              <p>No panels match your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PanelCardProps {
  panel: PanelConfig;
  isEnabled: boolean;
  onToggle: () => void;
  onAdd: () => void;
}

function PanelCard({ panel, isEnabled, onToggle, onAdd }: PanelCardProps) {
  return (
    <div
      className={`panel-card ${isEnabled ? 'enabled' : ''}`}
      onClick={onToggle}
    >
      <div className="panel-card-header">
        <div className="panel-card-checkbox">
          {isEnabled ? (
            <div className="checkbox checked">
              <CheckIcon size={12} />
            </div>
          ) : (
            <div className="checkbox" />
          )}
        </div>
        <span className="panel-card-icon">{panel.icon}</span>
        <span className="panel-card-name">{panel.name}</span>
        <button
          className="panel-card-add-btn"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          title="Add another panel instance"
        >
          +
        </button>
      </div>
      {panel.description && (
        <div className="panel-card-description">{panel.description}</div>
      )}
      <div className="panel-card-category">{panel.category}</div>
    </div>
  );
}
