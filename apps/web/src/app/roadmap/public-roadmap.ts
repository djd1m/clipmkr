type RoadmapStatus = 'in-progress' | 'planned' | 'done';

type RoadmapCard = {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
};

export const PUBLIC_ROADMAP: readonly RoadmapCard[] = [
  {
    id: 'stream-layouts',
    title: 'Оформление клипов из стримов',
    description: 'Сохранить демонстрацию и камеру стримера в вертикальном кадре.',
    status: 'planned',
  },
  {
    id: 'music',
    title: 'Смена музыки готового клипа',
    description: 'Выбрать другой трек для готового клипа, пока остальные ещё собираются.',
    status: 'done',
  },
  {
    id: 'fullscreen',
    title: 'Полноэкранный просмотр клипа',
    description: 'Открыть клип на весь экран в кабинете или в гостевом пакете.',
    status: 'done',
  },
  {
    id: 'support-history',
    title: 'Переписка с поддержкой',
    description: 'Открыть своё последнее обращение и вернуться к ответу после нового входа.',
    status: 'done',
  },
  {
    id: 'first-screen-composition',
    title: 'Автокомпоновка демонстрации',
    description: 'При первой нарезке Clipmkr сохраняет весь экран и переносит камеру, когда её окно устойчиво.',
    status: 'done',
  },
];
