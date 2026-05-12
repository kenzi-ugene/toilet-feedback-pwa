import { installViewportZoomGuards } from "./viewportZoomGuards";
import { bootstrap } from "./app/bootstrap";
import "./shared/styles/index.css";

installViewportZoomGuards();
void bootstrap();
