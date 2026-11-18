import { Component, Suspense, lazy, type ComponentType, type ReactNode } from 'react';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { toolMode, type FreeTool, type FreeToolKind } from '@/tools/catalog';
import { tx } from '@/tools/controls';

type Props = { tool: FreeTool; locale: string };

/** Each workspace module is its own chunk, so a tool page only downloads the code it uses. */
function pick<M>(load: () => Promise<M>, name: keyof M) {
  return lazy(async () => ({ default: (await load())[name] as ComponentType<Props> }));
}

const image = () => import('./workspaces/imageTools');
const make = () => import('./workspaces/makeTools');
const media = () => import('./workspaces/mediaTools');
const doc = () => import('./workspaces/docTools');
const studio = () => import('./workspaces/studioTools');
const model = () => import('./workspaces/modelTools');
const calc = () => import('./workspaces/calcTools');
const calcExtra = () => import('./workspaces/calcExtraTools');
const game = () => import('./workspaces/gameTools');
const play = () => import('./workspaces/playTools');
const device = () => import('./workspaces/deviceTools');

const CalcBasic = pick(calc, 'CalcTool');
const CalcExtra = pick(calcExtra, 'CalcExtraTool');
const Game = pick(game, 'GameTool');
const Play = pick(play, 'PlayTool');
const Device = pick(device, 'DeviceTool');

/* Modes served by the newer modules (kept in sync with CALC_EXTRA_MODES / PLAY_MODES). */
const CALC_EXTRA = new Set(['tip', 'discount', 'compound', 'calorie', 'salary', 'roman', 'bmr', 'hourly']);
const PLAY = new Set(['tic-tac-toe', 'memory', 'reaction', 'color-blind', 'gamepad']);

const WORKSPACES: Record<FreeToolKind, ComponentType<Props>> = {
  image: pick(image, 'ImageTool'),
  vectorizer: pick(image, 'VectorizerTool'),
  editor: pick(image, 'EditorTool'),
  crop: pick(image, 'CropTool'),
  collage: pick(make, 'CollageTool'),
  logo: pick(make, 'LogoTool'),
  passport: pick(make, 'PassportTool'),
  mockup: pick(make, 'MockupTool'),
  screenshots: pick(make, 'ScreenshotTool'),
  sticker: pick(make, 'StickerTool'),
  pattern: pick(make, 'PatternTool'),
  ffmpeg: pick(media, 'FfmpegTool'),
  lut: pick(media, 'LutTool'),
  gif: pick(media, 'GifTool'),
  subtitles: pick(media, 'SubtitleTool'),
  screen: pick(media, 'ScreenTool'),
  green: pick(media, 'GreenTool'),
  voice: pick(media, 'VoiceTool'),
  'video-editor': pick(media, 'VideoEditorTool'),
  teleprompter: pick(studio, 'TeleprompterTool'),
  music: pick(studio, 'MusicTool'),
  sheet: pick(studio, 'SheetTool'),
  piano: pick(studio, 'PianoTool'),
  guitar: pick(studio, 'GuitarTool'),
  whiteboard: pick(studio, 'WhiteboardTool'),
  'mind-map': pick(studio, 'MindMapTool'),
  sudoku: pick(studio, 'SudokuTool'),
  typing: pick(studio, 'TypingTool'),
  pdf: pick(doc, 'PdfTool'),
  qr: pick(doc, 'QrTool'),
  barcode: pick(() => import('./workspaces/barcodeTools'), 'BarcodeTool'),
  password: pick(doc, 'PasswordTool'),
  font: pick(doc, 'FontTool'),
  word: pick(doc, 'WordTool'),
  json: pick(doc, 'JsonTool'),
  mesh: pick(model, 'MeshTool'),
  relief: pick(model, 'ReliefTool'),
  dxf: pick(model, 'DxfTool'),
  calc: (props) => (CALC_EXTRA.has(toolMode(props.tool)) ? <CalcExtra {...props} /> : <CalcBasic {...props} />),
  game: (props) => (PLAY.has(toolMode(props.tool)) ? <Play {...props} /> : <Game {...props} />),
  device: (props) => (PLAY.has(toolMode(props.tool)) ? <Play {...props} /> : <Device {...props} />),
  'audio-lab': pick(() => import('./workspaces/audioLabTools'), 'AudioLabTool'),
  office: pick(() => import('./workspaces/officeTools'), 'OfficeTool'),
  geo: pick(() => import('./workspaces/geoTools'), 'GeoTool'),
  dev: pick(() => import('./workspaces/devTools'), 'DevTool'),
  unit: pick(() => import('./workspaces/unitTools'), 'UnitTool'),
  color: pick(() => import('./workspaces/colorTools'), 'ColorTool'),
  'web-asset': pick(() => import('./workspaces/webAssetTools'), 'WebAssetTool'),
  net: pick(() => import('./workspaces/netTools'), 'NetTool'),
};

export function WorkspaceSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5" aria-hidden="true">
      <div className="skeleton h-56 rounded-lg sm:h-72" />
      <div className="flex gap-3">
        <div className="skeleton h-10 flex-1 rounded-md" />
        <div className="skeleton h-10 w-28 rounded-md" />
      </div>
    </div>
  );
}

type BoundaryProps = { locale: string; children: ReactNode; resetKey: string };

class WorkspaceBoundary extends Component<BoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: BoundaryProps) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    const { locale } = this.props;
    if (!error) return this.props.children;
    const chunk = /dynamically imported module|Failed to fetch|Loading chunk|Importing a module script failed/i.test(error.message);
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface px-6 py-12 text-center shadow-sm">
        <TriangleAlert className="size-6 text-danger" aria-hidden="true" />
        <h2 className="text-base font-semibold">{tx(locale, 'This tool could not start', '这个工具没能启动')}</h2>
        <p className="max-w-md text-sm text-fg-muted">
          {chunk
            ? tx(locale, 'Part of the page did not download. Check your connection and reload.', '页面的一部分没有下载成功。请检查网络后重新加载。')
            : error.message}
        </p>
        <button
          type="button"
          onClick={() => (chunk ? window.location.reload() : this.setState({ error: null }))}
          className="mt-1 inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-bg px-4 text-sm font-medium hover:bg-surface-2"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {chunk ? tx(locale, 'Reload', '重新加载') : tx(locale, 'Try again', '重试')}
        </button>
      </div>
    );
  }
}

export function Workspace({ tool, locale }: Props) {
  const View = WORKSPACES[tool.kind];
  return (
    <WorkspaceBoundary locale={locale} resetKey={tool.slug}>
      <Suspense fallback={<WorkspaceSkeleton />}>
        <View key={tool.slug} tool={tool} locale={locale} />
      </Suspense>
    </WorkspaceBoundary>
  );
}
