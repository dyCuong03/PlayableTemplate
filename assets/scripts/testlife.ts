import { _decorator, Component, Node } from 'cc';
import {IInitializable, ITickable, register_lifecycle} from "db://assets/plugins/game-foundation/lifecycle_manager";
const { ccclass, property } = _decorator;

@register_lifecycle()
@ccclass('testlife')
export class testlife extends Component implements IInitializable, ITickable {
    Initialize() : void {
        console.log("Initialize");
    }
    
    Tick(deltaTime: number) {
        console.log("Tick");
    }
}


