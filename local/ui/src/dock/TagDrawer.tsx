import { trigger, useValue } from "cs2/api";
import { Button, Scrollable } from "cs2/ui";
import { FOCUS_DISABLED } from "cs2/input";
import { useState } from "react";
import classNames from "classnames";
import * as B from "bindings";
import { TagListEditor } from "upstream/mods/TagEditor/TagListEditor";
import { GLYPH, InputTheme, TextInput } from "native";
import { Btn, Glyph, HeaderIconBtn } from "./controls";
import styles from "./dock.module.scss";

const Head = (props: { title: string; onClose: () => void }) => (
  <div className={styles.drawerHead}>
    <div className={styles.drawerTitle}>{props.title}</div>
    <HeaderIconBtn src={GLYPH.close} className={styles.drawerClose} tooltip="Close" onSelect={props.onClose} />
  </div>
);

const Done = (props: { onSelect: () => void }) => (
  <div className={styles.drawerFoot}>
    <Button variant="flat" className={classNames(styles.footBtn, styles.footBtnPrimary)} focusKey={FOCUS_DISABLED} onSelect={props.onSelect}>
      Done
    </Button>
  </div>
);

// One asset's tags: the mod's own tag editor (C# TagEditor* bindings), shown as a drawer.
export const TagDrawer = () => {
  const id = useValue(B.TagEditorPrefabId$);
  const name = useValue(B.TagEditorPrefabName$);
  const tags = useValue(B.TagEditorTags$);
  const creatorTags = useValue(B.TagEditorCreatorTags$);
  const allTags = useValue(B.AllTags$);
  const close = () => trigger(B.G, "CloseTagEditor");

  return (
    <div className={styles.drawer}>
      <Head title="Tags" onClose={close} />
      <div className={styles.drawerSub}>{name}</div>
      <Scrollable className={styles.drawerBody} vertical trackVisibility="scrollable">
        <div className={styles.drawerPad}>
          <TagListEditor
            tags={tags}
            lockedTags={creatorTags}
            allTags={allTags}
            resetKey={id}
            onAdd={(tag) => trigger(B.G, "AddTag", tag)}
            onRemove={(tag) => trigger(B.G, "RemoveTag", tag)}
            onEscape={close}
          />
          <div className={styles.hint}>Tags appear under Saved, the star tab. Typing #tag in the search box finds them too.</div>
        </div>
      </Scrollable>
      <Done onSelect={close} />
    </div>
  );
};

// Several assets at once: the ones picked in select mode, or every current result.
export const BulkTagDrawer = (props: { ids: number[]; allResults: boolean; onClose: () => void }) => {
  const count = useValue(B.PrefabCount$);
  const tagCounts = useValue(B.TagCounts$);
  const [text, setText] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const own = tagCounts.filter((t) => !t.creator).map((t) => t.tag);
  const target = props.allResults ? `all results (${count})` : `${props.ids.length} picked ${props.ids.length === 1 ? "asset" : "assets"}`;
  const tagText = text.trim().replace(/^#+/, "").replace(/\s+/g, "-");
  const suggestions = own.filter((t) => tagText === "" || t.toLowerCase().includes(tagText.toLowerCase())).slice(0, 30);

  const apply = (tag: string, add: boolean) => {
    if (!tag) return;
    if (props.allResults) {
      trigger(B.G, add ? "TagAllResults" : "UntagAllResults", tag);
    } else {
      trigger(B.G, add ? "TagMany" : "UntagMany", props.ids.join(","), tag);
    }
    setDone(`${add ? "Added" : "Removed"} #${tag} ${add ? "to" : "from"} ${target}.`);
    setText("");
  };

  return (
    <div className={styles.drawer}>
      <Head title="Tag several assets" onClose={props.onClose} />
      <div className={styles.drawerSub}>{target}</div>
      <Scrollable className={styles.drawerBody} vertical trackVisibility="scrollable">
        <div className={styles.drawerPad}>
          <div className={styles.fieldLabel}>Add a tag</div>
          <div className={styles.inputRow}>
            {TextInput && (
              <TextInput
                multiline={1}
                value={text}
                disabled={false}
                type="text"
                className={classNames(InputTheme.input, styles.miniInput)}
                focusKey={FOCUS_DISABLED}
                onChange={(e: Event) => setText(((e?.target as HTMLTextAreaElement | null)?.value ?? "").replace(/\n/g, ""))}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    apply(tagText, true);
                  }
                }}
                placeholder="New or existing tag"
              />
            )}
            <Button variant="flat" className={classNames(styles.footBtn, styles.footBtnPrimary)} focusKey={FOCUS_DISABLED} disabled={tagText === ""} onSelect={() => apply(tagText, true)}>
              Add
            </Button>
          </div>
          <div className={styles.pills}>
            {suggestions.map((t) => (
              <Btn key={t} className={styles.pill} onSelect={() => apply(t, true)}>
                <span>+ #{t}</span>
              </Btn>
            ))}
          </div>
          {own.length > 0 && (
            <>
              <div className={styles.fieldLabel}>Remove a tag</div>
              <div className={styles.pills}>
                {own.map((t) => (
                  <Btn key={t} className={styles.pill} onSelect={() => apply(t, false)}>
                    <span>#{t}</span>
                    <Glyph src={GLYPH.close} className={styles.activeX} />
                  </Btn>
                ))}
              </div>
            </>
          )}
          {done && <div className={styles.hint}>{done}</div>}
        </div>
      </Scrollable>
      <Done onSelect={props.onClose} />
    </div>
  );
};
