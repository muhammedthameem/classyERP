const fs = require('fs');
const path = 'g:/Webly Works/classyERP/src/components/Dashboard.jsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const startIdx = 961;
const endIdx = 1386;

const cardRenderCode = lines.slice(startIdx, endIdx + 1).join('\n');

let returnIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('  return (') && lines[i+1].includes('min-h-screen')) {
    returnIdx = i;
    break;
  }
}

if (returnIdx === -1) {
  console.log('Failed to find return');
  process.exit(1);
}

const funcStr = '  const renderDashboardCard = (card, idx) => (\n' + cardRenderCode + '\n  );\n\n';

lines.splice(returnIdx, 0, funcStr);

let masonryStart = -1;
let masonryEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<Masonry') && lines[i+1].includes('breakpointCols')) {
    masonryStart = i;
  }
  if (masonryStart !== -1 && lines[i].includes('</Masonry>')) {
    masonryEnd = i;
    break;
  }
}

if (masonryStart === -1 || masonryEnd === -1) {
  console.log('Failed to find Masonry');
  process.exit(1);
}

const newMasonryBlock = `                {(() => {
                  const visibleCards = dashboardCards.filter(c => c.visible && (!c.adminOnly || user?.role === 'Admin'));
                  const groups = [];
                  let currentGroup = { isFull: false, items: [] };
                  visibleCards.forEach(card => {
                    const isFull = getCardSpan(card).includes('span-full');
                    if (isFull !== currentGroup.isFull) {
                      if (currentGroup.items.length > 0) groups.push(currentGroup);
                      currentGroup = { isFull, items: [card] };
                    } else {
                      currentGroup.items.push(card);
                    }
                  });
                  if (currentGroup.items.length > 0) groups.push(currentGroup);

                  return groups.map((group, groupIdx) => {
                    if (group.isFull) {
                      return (
                        <div key={groupIdx} className="flex flex-col gap-6">
                          {group.items.map((card, idx) => renderDashboardCard(card, visibleCards.indexOf(card)))}
                        </div>
                      );
                    } else {
                      return (
                        <Masonry key={groupIdx} breakpointCols={{default: 2, 1023: 1}} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
                          {group.items.map((card, idx) => renderDashboardCard(card, visibleCards.indexOf(card)))}
                        </Masonry>
                      );
                    }
                  });
                })()}`;

lines.splice(masonryStart, masonryEnd - masonryStart + 1, newMasonryBlock);

fs.writeFileSync(path, lines.join('\n'));
console.log('Done!');
