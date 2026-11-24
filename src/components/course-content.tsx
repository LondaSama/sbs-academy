import type { ReactNode } from "react";

/**
 * Rendu simple du contenu de cours.
 * Sous-ensemble volontairement réduit de Markdown : ## titres, ### sous-titres,
 * listes à puces, listes numérotées, **gras**, paragraphes.
 * Le texte est inséré via React (jamais dangerouslySetInnerHTML) : aucun
 * risque d'injection HTML depuis le contenu saisi par un professeur.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // Découpe sur **gras** en conservant les délimiteurs.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.filter(Boolean).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

export function CourseContent({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <p className="text-sm italic text-navy-400">
        Ce chapitre ne contient pas encore de contenu.
      </p>
    );
  }

  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];

  let bullets: string[] = [];
  let numbers: string[] = [];
  let paragraph: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ");
    blocks.push(<p key={`p-${key++}`}>{renderInline(text, `p${key}`)}</p>);
    paragraph = [];
  };

  const flushBullets = () => {
    if (bullets.length === 0) return;
    const items = bullets;
    blocks.push(
      <ul key={`ul-${key++}`}>
        {items.map((item, i) => (
          <li key={i}>{renderInline(item, `ul${key}-${i}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  const flushNumbers = () => {
    if (numbers.length === 0) return;
    const items = numbers;
    blocks.push(
      <ol key={`ol-${key++}`}>
        {items.map((item, i) => (
          <li key={i}>{renderInline(item, `ol${key}-${i}`)}</li>
        ))}
      </ol>,
    );
    numbers = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushBullets();
    flushNumbers();
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === "") {
      flushAll();
      continue;
    }

    if (line.startsWith("### ")) {
      flushAll();
      blocks.push(<h3 key={`h3-${key++}`}>{line.slice(4)}</h3>);
      continue;
    }

    if (line.startsWith("## ")) {
      flushAll();
      blocks.push(<h2 key={`h2-${key++}`}>{line.slice(3)}</h2>);
      continue;
    }

    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      flushNumbers();
      bullets.push(bulletMatch[1]);
      continue;
    }

    const numberMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numberMatch) {
      flushParagraph();
      flushBullets();
      numbers.push(numberMatch[1]);
      continue;
    }

    flushBullets();
    flushNumbers();
    paragraph.push(line.trim());
  }

  flushAll();

  return <div className="prose-course text-[15px] text-navy-700">{blocks}</div>;
}
