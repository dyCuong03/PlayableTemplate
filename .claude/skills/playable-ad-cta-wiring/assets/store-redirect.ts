import { constant } from '../../configs/constant';

type Network = 'mraid' | 'mintegral' | 'ironsource' | 'vungle' | 'applovin' | 'unity' | 'google' | 'fallback';

declare const window: any;

function detectNetwork(): Network {
    if (typeof window === 'undefined') return 'fallback';

    if (typeof window.mraid !== 'undefined') return 'mraid';
    if (typeof window.gameEnd === 'function' && typeof window.install === 'function') return 'mintegral';
    if (typeof window.dapi !== 'undefined') return 'ironsource';
    if (typeof window.parent?.postMessage === 'function' && typeof window.FbPlayableAd !== 'undefined') return 'fallback';
    if (typeof window.vungle !== 'undefined' || typeof window.parent?.vungle !== 'undefined') return 'vungle';
    if (typeof window.al_onPlayableEvent === 'function' || typeof window.al_onPoke === 'function') return 'applovin';
    if (typeof window.UnityAdsLoadCompleted === 'function') return 'unity';
    if (typeof window.ExitApi !== 'undefined') return 'google';

    return 'fallback';
}

function isIOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function pickStoreUrl(): string {
    return isIOS() ? constant.STORE_LINK.IOS_LINK : constant.STORE_LINK.ANDROID_LINK;
}

export function openStore(): void {
    const network = detectNetwork();
    const url = pickStoreUrl();

    try {
        switch (network) {
            case 'mraid':
                window.mraid.open(url);
                return;
            case 'mintegral':
                window.install();
                window.gameEnd?.();
                return;
            case 'ironsource':
                window.dapi.openStoreUrl();
                return;
            case 'vungle':
                (window.vungle ?? window.parent.vungle).requestCustomEvent('click');
                window.parent?.postMessage?.('download', '*');
                return;
            case 'applovin':
                window.al_onPoke?.();
                window.parent?.postMessage?.({ type: 'click' }, '*');
                window.open(url, '_blank');
                return;
            case 'unity':
                window.UnityAdsExit?.();
                window.open(url, '_blank');
                return;
            case 'google':
                window.ExitApi.exit();
                return;
            default:
                window.open(url, '_blank');
        }
    } catch (e) {
        console.error('[CTA] redirect failed, falling back to window.open', e);
        window.open(url, '_blank');
    }
}

export function onWin(): void {
    openStore();
}

export function onLose(): void {
    openStore();
}

export const __ctaNetwork = detectNetwork;
