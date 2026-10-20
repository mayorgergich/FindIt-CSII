import { trigger, useValue } from "cs2/api";
import { Theme } from "cs2/bindings";
import { getModule } from "cs2/modding";
import { Scrollable } from "cs2/ui";
import { FOCUS_DISABLED } from "cs2/input";
import { useState } from "react";
import classNames from "classnames";
import * as B from "bindings";
import { TagListEditor } from "upstream/mods/TagEditor/TagListEditor";
import { Btn, MaskIcon } from "./controls";
import styles from "./dock.module.scss";

const TextInput = getModule("game-ui/common/input/text/text-input.tsx", "TextInput");
const TextInputTheme: Theme | any = getModule("game-ui/editor/widgets/item/editor-item.module.scss", "classes");

const Head = (props: { title: string; onClose: () => void }) => (
  <div className={styles.drawerHead}>
    <div className={styles.drawerTitle}>{props.title}</div>
    <Btn className={classNames(styles.btn, styles.iconBtn)} tooltip="Close" onSelect={props.onClose}>
      <MaskIcon src="coui://uil/Standard/XClose.svg" className={styles.btnIcon} />
    </Btn>
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
        <div className={styles.drawerBodyInner}>
          <TagListEditor
            tags={tags}
            lockedTags={creatorTags}
            allTags={allTags}
            resetKey={id}
            onAdd={(tag) => trigger(B.G, "AddTag", tag)}
            onRemove={(tag) => trigger(B.G, "RemoveTag", tag)}
            onEscape={close}
          />
          <div className={styles.hint}>Tags show up under Saved in the rail. Typing #tag in the search box also finds them.</div>
        </div>
      </Scrollable>
      <div className={styles.drawerFoot}>
        <Btn className={classNames(styles.btn, styles.on)} onSelect={close}>
          Done
        </Btn>
      </div>
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
  const target = props.allResults ? `all results (${count})` : `${props.ids.length} selected ${props.ids.length === 1 ? "asset" : "assets"}`;
  const tagText = text.trim().replace(/^#+/, "").replace(/\s+/g, "-");
  const suggestions = own.filter((t) => tagText === "" || t.toLowerCase().includes(tagText.toLowerCase())).slice(0, 30);

  const apply = (tag: string, add: boolean) => {
    if (!tag) return;
    if (props.allResults) {
      trigger(B.G, add ? "TagAllResults" : "UntagAllResults", tag);
    } else {
      trigger(B.G, add ? "TagMany" : "UntagMany", props.ids.join(","), tag);
    }
    setDone(`${add ? "Added" : "Removed"} #${tag} ${add ? "to" : "from"} ${target}`);
    setText("");
  };

  return (
    <div className={styles.drawer}>
      <Head title="Tag several assets" onClose={props.onClose} />
      <div className={styles.drawerSub}>{target}</div>
      <Scrollable className={styles.drawerBody} vertical trackVisibility="scrollable">
        <div className={styles.drawerBodyInner}>
          <div className={styles.group}>
            <div className={styles.groupTitle}>Add a tag</div>
            <div className={styles.headRow}>
              <div className={styles.search}>
                <TextInput
                  multiline={1}
                  value={text}
                  disabled={false}
                  type="text"
                  className={classNames(TextInputTheme.input, styles.miniInput)}
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
              </div>
              <Btn className={classNames(styles.btn, styles.on)} disabled={tagText === ""} onSelect={() => apply(tagText, true)}>
                Add
              </Btn>
            </div>
            <div className={styles.chips} style={{ padding: "8rem 0 0 0" }}>
              {suggestions.map((t) => (
                <Btn key={t} className={styles.chip} onSelect={() => apply(t, true)}>
                  + #{t}
                </Btn>
              ))}
            </div>
          </div>
          {own.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupTitle}>Remove a tag</div>
              <div className={styles.chips} style={{ padding: 0 }}>
                {own.map((t) => (
                  <Btn key={t} className={styles.chip} onSelect={() => apply(t, false)}>
                    #{t}
                    <div className={styles.chipX}>×</div>
                  </Btn>
                ))}
              </div>
            </div>
          )}
          {done && <div className={styles.hint}>{done}</div>}
        </div>
      </Scrollable>
      <div className={styles.drawerFoot}>
        <Btn className={classNames(styles.btn, styles.on)} onSelect={props.onClose}>
          Done
        </Btn>
      </div>
    </div>
  );
};
