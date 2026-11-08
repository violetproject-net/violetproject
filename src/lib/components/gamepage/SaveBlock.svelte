<script lang="ts">
    import { t } from '../../i18n.svelte';

    let {
        ready,
        saveExists,
        saveId,
        onDownload,
        onUpload,
        onDelete
    } = $props();

    let deleteRequested = $state(false);
    let timeoutId: number = -1;

    function deleteClicked() {
        if (deleteRequested) {
            onDelete(saveId);
            deleteRequested = false;
            clearTimeout(timeoutId);
            timeoutId = -1;
            return;
        }
        deleteRequested = true;
        // quick time event
        timeoutId = setTimeout(() => deleteRequested = false, 3000);
    }
</script>

<div class="saveblock">
    <b>{t('saves.slot', 'Slot {saveId}', { saveId: saveId })}</b>
    <div class="buttons">
        <button disabled={!saveExists || !ready} onclick={() => onDownload(saveId)}>{t('saves.download', 'Download')}</button>
        <button disabled={!ready}                        onclick={() => onUpload(saveId)}>{t('saves.upload', 'Upload')}</button>
        <button disabled={!saveExists || !ready} 
                    onclick={() => deleteClicked()}>
                    {#if deleteRequested}
                        {t('saves.deleteConfirm', 'Confirm')}
                    {:else}
                        {t('saves.delete', 'Delete')}
                    {/if}
                </button>
    </div>
</div>