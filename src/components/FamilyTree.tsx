import type { Char, GameState } from "../game/types";

interface TreePerson {
  character: Char;
  relation: string;
}

function uniquePeople(entries: TreePerson[]): TreePerson[] {
  const seen = new Set<string>();
  return entries.filter(({ character }) => {
    if (seen.has(character.id)) return false;
    seen.add(character.id);
    return true;
  });
}

function TreePersonCard({ person, isPlayer, onSelect }: { person: TreePerson; isPlayer: boolean; onSelect: (id: string) => void }) {
  const { character, relation } = person;
  const details = `${relation}: ${character.firstName} ${character.lastName}, ${character.alive ? `age ${character.age}` : `died aged ${character.age}`}`;
  const contents = (
    <>
      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-peach">{relation}</span>
      <span className="block font-bold text-sm break-words">{character.firstName} {character.lastName}</span>
      <span className="block text-xs text-dim">{character.alive ? `Age ${character.age}` : `Died aged ${character.age}`}</span>
    </>
  );

  if (isPlayer) {
    return <div role="treeitem" aria-current="true" aria-label={`You, ${details}`} className="panel-inset border-peach/70 bg-peach/10 p-3 min-w-0">{contents}</div>;
  }
  return (
    <button
      type="button"
      role="treeitem"
      aria-label={`Open ${details} profile`}
      onClick={() => onSelect(character.id)}
      className="panel-inset p-3 text-left min-w-0 hover:border-peach/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach"
    >
      {contents}
    </button>
  );
}

export function FamilyTree({ s, onSelectNpc }: { s: GameState; onSelectNpc: (id: string) => void }) {
  const player = s.chars[s.currentId];
  const get = (id?: string) => (id ? s.chars[id] : undefined);
  const mother = get(player.motherId);
  const father = get(player.fatherId);
  const grandparents = uniquePeople([
    ...(mother?.motherId && get(mother.motherId) ? [{ character: get(mother.motherId)!, relation: "Maternal grandmother" }] : []),
    ...(mother?.fatherId && get(mother.fatherId) ? [{ character: get(mother.fatherId)!, relation: "Maternal grandfather" }] : []),
    ...(father?.motherId && get(father.motherId) ? [{ character: get(father.motherId)!, relation: "Paternal grandmother" }] : []),
    ...(father?.fatherId && get(father.fatherId) ? [{ character: get(father.fatherId)!, relation: "Paternal grandfather" }] : []),
  ]);
  const parents = [
    ...(mother ? [{ character: mother, relation: "Mother" }] : []),
    ...(father ? [{ character: father, relation: "Father" }] : []),
  ];
  const siblings = Object.values(s.chars)
    .filter((c) => c.id !== player.id && ((player.motherId && c.motherId === player.motherId) || (player.fatherId && c.fatherId === player.fatherId)))
    .sort((a, b) => a.birthYear - b.birthYear)
    .map((character) => ({ character, relation: character.gender === "female" ? "Sister" : "Brother" }));
  const partner = get(player.partnerId);
  const generation = uniquePeople([
    ...siblings,
    { character: player, relation: "You" },
    ...(partner ? [{ character: partner, relation: "Partner" }] : []),
  ]);
  const children = player.childrenIds.map(get).filter((c): c is Char => !!c).map((character) => ({
    character,
    relation: character.gender === "female" ? "Daughter" : "Son",
  }));
  const grandchildren = uniquePeople(children.flatMap(({ character }) => character.childrenIds.map(get)
    .filter((c): c is Char => !!c)
    .map((grandchild) => ({ character: grandchild, relation: "Grandchild" }))));

  const levels = [
    { title: "Grandparents", people: grandparents },
    { title: "Parents", people: parents },
    { title: "You, siblings & partner", people: generation },
    { title: "Children", people: children },
    { title: "Grandchildren", people: grandchildren },
  ].filter((level) => level.people.length > 0);

  return (
    <div className="panel p-4 sm:p-5" role="tree" aria-label="Family tree by generation">
      <p className="text-sm text-dim mb-4">Follow the generations; tap a relative to open their profile.</p>
      <div className="space-y-2">
        {levels.map((level, index) => (
          <div key={level.title}>
            {index > 0 && <div aria-hidden="true" className="h-5 w-px bg-peach/50 mx-auto" />}
            <section role="group" aria-label={level.title}>
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-dim mb-2 text-center">{level.title}</h3>
              <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
                {level.people.map((person) => (
                  <TreePersonCard key={`${person.character.id}:${person.relation}`} person={person} isPlayer={person.character.id === player.id} onSelect={onSelectNpc} />
                ))}
              </div>
            </section>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-dim mt-4">Only recorded parent, partner and child links are shown. Unknown relatives are not guessed.</p>
    </div>
  );
}
