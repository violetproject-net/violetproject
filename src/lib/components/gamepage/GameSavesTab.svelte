<script lang="ts">
    import { t } from '../../i18n.svelte';
    import SaveBlock from './SaveBlock.svelte';

    let { engine, savePresence, onUpload, onDownload, onDelete, saveError } = $props();

    function uploadSave(saveId: number) {
        console.log(`[violetproject] uploadSave(${saveId})`);
        void onUpload(saveId);
    }

    function downloadSave(saveId: number) {
        console.log(`[violetproject] downloadSave(${saveId})`);
        void onDownload(saveId);
    }

    function deleteSave(saveId: number) {
        console.log(`[violetproject] deleteSave(${saveId})`);
        void onDelete(saveId);
    }

    let errorDismissed = $state(false);

    // this is a little silly, yes....
    $effect(() => {
        // also if the same error happens twice right nwo this effect does not trigger but whatever at thjis point bro
        // I will fix this later!
        // Sizuku: Ayo, let me handle this G
        void saveError;
        errorDismissed = false;
    })
</script>

<div class="chat-log">
    {#if !errorDismissed}
        {#if saveError !== "ok"}
            {#if saveError === "not found"}
                <b class="saveerror" onclick={() => errorDismissed = true}>{t('saves.notFound', "Save doesn't exist")}</b>
            {:else if saveError === "exception"}
                <b class="saveerror" onclick={() => errorDismissed = true}>{t('saves.exception', "Unexpected error occurred, check the console in F12 for error details!")}</b>
            {:else}
                <b class="saveerror" onclick={() => errorDismissed = true}>{t('saves.unknownError', "Unknown error occurred")}</b>
            {/if}
        {/if}
    {/if}
    <div class="sys">{t('saves.syncNote1', "Only saves 1-3 are synced with the cloud.")}</div>
    <div class="sys">{t('saves.syncNote2', "Cloud saves are only available with an account.")}</div>

    <div class="savesgrid">
        {#each { length: 3 }, num}
            <SaveBlock
                saveExists={savePresence[num] ?? false}
                saveId={num + 1}
                ready={engine !== null}
                onDownload={downloadSave}
                onUpload={uploadSave}
                onDelete={deleteSave}
            />
        {/each}
    </div>

    <hr class="solid">

    <div class="savesgrid">
        {#each { length: 12 }, num}
            <SaveBlock
                saveExists={savePresence[num + 3] ?? false}
                saveId={num + 4}
                ready={engine !== null}
                onDownload={downloadSave}
                onUpload={uploadSave}
                onDelete={deleteSave}
            />
        {/each}
    </div>
</div>

<!--may as well inline this style in here for now-->
<!--we are not really using hr anywhere else afaik-->
<style>
    .saveerror {
        color: #ff4b4b;
        font-size: 12px;
    }
    hr.solid {
        border: 1px solid #6c4a7d;
        stroke: none;
        width: 100%;
    }
</style>
