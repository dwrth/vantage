import builder from '../styles/builder.module.css';
import { useBuilderActions } from '../hooks/useBuilderActions';
import { useBuilderContext } from '../context/BuilderContext';
import { SectionView } from './SectionView';

export function Canvas() {
  const { layout } = useBuilderContext();
  const { addSection } = useBuilderActions();
  const { sections } = layout;

  if (sections.length === 0) {
    return (
      <div className={builder['canvas-empty']}>
        <p>No sections yet.</p>
        <button type="button" onClick={() => addSection()}>
          Add section
        </button>
      </div>
    );
  }

  return (
    <div className={builder.canvas}>
      {sections.map((section) => (
        <SectionView key={section.id} section={section} />
      ))}
    </div>
  );
}
