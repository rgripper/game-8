import humanImage from '../assets/Human.png';
import monsterImage from '../assets/Monster.png';
import projectileImage from '../assets/Projectile.png';
import * as PIXI from 'pixi.js';
import { Observable, Subscriber, pipe } from 'rxjs';
import { buffer, map, tap } from 'rxjs/operators';
import { Diff, Entity, ModelType, Player } from '../client-sim/sim';

const renderedEntities = new Map<number, RenderedItem>();
let renderedPlayer: RenderedItem | undefined;

export function createRenderingPipe(app: PIXI.Application, currentPlayerId: number) {
    const frames$: Observable<void> = Observable.create((subscriber: Subscriber<void>) => {
        app.ticker.add(() => subscriber.next());
    });
    const batchDiffBatchesPerFrame = buffer<Diff[]>(frames$);
    const collectDiffs = map((diffs: Diff[][]) => diffs.flat());
    return pipe(
        batchDiffBatchesPerFrame,
        collectDiffs,
        tap(diffs => renderDiffs(diffs, app, currentPlayerId)),
    );
}

function getImageByBehaviourType(entity: Entity): string {
    switch (entity.model_type) {
        case ModelType.Human:
            return humanImage;
        case ModelType.Monster:
            return monsterImage;
        case ModelType.Projectile:
            return projectileImage;
    }

    throw new Error(`Unknown entity.model_type '${entity.model_type}'`);
}

type RenderedItem = {
    container: PIXI.DisplayObject;
    main: PIXI.Sprite;
};

function createRenderedEntity(entity: Entity, app: PIXI.Application, image: string): RenderedItem {
    const sprite = PIXI.Sprite.from(image);
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    sprite.scale.x /= 6;
    sprite.scale.y /= 6;
    sprite.x = entity.boundaries.size.width / 2;
    sprite.y = entity.boundaries.size.height / 2;

    const collisionRect = new PIXI.Graphics();
    collisionRect.lineStyle(1, 0x90caf9, 0.8);
    collisionRect.drawRect(0, 0, entity.boundaries.size.width, entity.boundaries.size.height);

    const container = new PIXI.Container();
    container.addChild(sprite);
    container.addChild(collisionRect);

    const renderedEntity = {
        container,
        main: sprite,
    };

    app.stage.addChild(container);

    renderedEntities.set(entity.id, renderedEntity);

    return renderedEntity;
}

function createRenderedPlayer(player: Player, app: PIXI.Application): RenderedItem {
    console.log("createRenderedPlayer");
    const text = new PIXI.Text('sample text', {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xff1010,
        align: 'center'
    });

    const container = new PIXI.Container();
    container.addChild(text);
    container.x = app.view.width - 50;
    container.y = 10;

    const renderedEntity = {
        container,
        main: text
    };

    app.stage.addChild(container);

    return renderedEntity;
}

export function renderDiffs(diffs: Diff[], app: PIXI.Application, currentPlayerId: number) {
    diffs.forEach(diff => {
        if (diff.type !== 'UpsertEntity' && diff.type !== 'DeleteEntity' && diff.type !== 'UpsertPlayer') {
            return;
        }
        if (diff.type === 'UpsertPlayer' && currentPlayerId !== diff.player.id) {
            return;
        }
        switch (diff.type) {
            case 'UpsertEntity': {
                const re =
                    renderedEntities.get(diff.entity.id) ||
                    createRenderedEntity(diff.entity, app, getImageByBehaviourType(diff.entity));
                re.container.alpha = diff.entity.health.current / diff.entity.health.max;
                re.main.rotation = diff.entity.rotation;
                re.container.x = diff.entity.boundaries.top_left.x;
                re.container.y = diff.entity.boundaries.top_left.y;
                return;
            }
            case 'DeleteEntity': {
                const re = renderedEntities.get(diff.id)!;
                app.stage.removeChild(re.container);
                renderedEntities.delete(diff.id);
                return;
            }
            case 'UpsertPlayer': {
                renderedPlayer = renderedPlayer ?? createRenderedPlayer(diff.player, app);
                console.log(diff.player.credit.current);

                const re = renderedPlayer.main as PIXI.Text;
                re.text = diff.player.credit.current.toString();
                return;
            }
        }
    });
}
