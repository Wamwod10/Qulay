import { getLocale } from "../../../../localization/i18n";

export const DEFAULT_PRODUCTION_STAGES = [
    {
        id: "mixing",
        name: "Aralashtirish",
        status: "PENDING",
        startedAt: null,
        completedAt: null,
    },
    {
        id: "baking",
        name: "Pishirish",
        status: "PENDING",
        startedAt: null,
        completedAt: null,
    },
    {
        id: "cooling",
        name: "Sovutish",
        status: "PENDING",
        startedAt: null,
        completedAt: null,
    },
    {
        id: "packaging",
        name: "Qadoqlash",
        status: "PENDING",
        startedAt: null,
        completedAt: null,
    },
];

export const getProductionStages = (
    order,
) => {
    if (
        Array.isArray(order?.stages) &&
        order.stages.length
    ) {
        return order.stages;
    }

    return DEFAULT_PRODUCTION_STAGES.map(
        (stage) => ({
            ...stage,
        }),
    );
};

export const startProductionStage = (
    stages,
    stageId,
) => {
    const stageIndex =
        stages.findIndex(
            (stage) =>
                stage.id === stageId,
        );

    if (stageIndex < 0) {
        throw new Error(
            "Bosqich topilmadi.",
        );
    }

    const stage =
        stages[stageIndex];

    if (
        stage.status !== "PENDING"
    ) {
        throw new Error(
            "Bu bosqichni boshlash mumkin emas.",
        );
    }

    if (stageIndex > 0) {
        const previousStage =
            stages[
            stageIndex - 1
            ];

        if (
            previousStage.status !==
            "COMPLETED"
        ) {
            throw new Error(
                `"${previousStage.name}" bosqichi tugatilmagan.`,
            );
        }
    }

    return stages.map(
        (item) =>
            item.id === stageId
                ? {
                    ...item,
                    status:
                        "IN_PROGRESS",
                    startedAt:
                        new Date().toLocaleString(
                            getLocale(),
                        ),
                }
                : item,
    );
};

export const completeProductionStage = (
    stages,
    stageId,
) => {
    const stage =
        stages.find(
            (item) =>
                item.id === stageId,
        );

    if (!stage) {
        throw new Error(
            "Bosqich topilmadi.",
        );
    }

    if (
        stage.status !==
        "IN_PROGRESS"
    ) {
        throw new Error(
            "Faqat jarayondagi bosqichni tugatish mumkin.",
        );
    }

    return stages.map(
        (item) =>
            item.id === stageId
                ? {
                    ...item,
                    status:
                        "COMPLETED",
                    completedAt:
                        new Date().toLocaleString(
                            getLocale(),
                        ),
                }
                : item,
    );
};

export const areAllStagesCompleted = (
    stages = [],
) => {
    return (
        stages.length > 0 &&
        stages.every(
            (stage) =>
                stage.status ===
                "COMPLETED",
        )
    );
};
