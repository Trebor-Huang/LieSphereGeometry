/// <reference path="../node_modules/mathjs/types/index.d.ts" />
type Matrix = math.Matrix;

const Length = 100;  // Unit length in pixels

type Cycle = [number, number, number, number, number];

function dot(x:Cycle, y:Cycle){
    return x[0]*y[0] - x[1]*y[1] - x[2]*y[2] - x[3]*y[4] - x[4]*y[3];
}

function point(x:number, y:number) : Cycle {
    return [0, x, y, -1, (x*x+y*y)/2];
}

function line(angle:number, distance:number) : Cycle {
    return [1, Math.sin(angle), Math.cos(angle), 0, distance];
}

function circle(x0:number, y0:number, r:number) : Cycle {
    return [r, x0, y0, -1, (x0*x0+y0*y0-r*r)/2];
}

type LieTransform = [number, number, number, number, number, number, number, number, number, number];
function toAlgebra([a,b,c,d,e,f,g,h,i,j]: LieTransform) {
    return math.matrix([
        [ 0, a, b, c, d],
        [ a, 0, e, f, g],
        [ b,-e, 0, h, i],
        [ d,-g,-i, j, 0],
        [ c,-f,-h, 0,-j]
    ]);
}

function exp(u: Matrix) : Matrix {
    var addend = math.identity(5) as Matrix;
    var result = math.zeros([5,5]) as Matrix;
    var k = 0;
    while (math.max(math.abs(addend)) > 1e-15) {
        result = math.add(result, addend);
        k += 1;
        addend = math.divide(math.multiply(addend, u), k) as Matrix;
    }
    return result;
}

function inverse([a,b,c,d,e,f,g,h,i,j]: LieTransform) : LieTransform {
    return [-a,-b,-c,-d,-e,-f,-g,-h,-i,-j];
}

function transform(u: LieTransform, p: Cycle) {
    return math.multiply(exp(toAlgebra(u)), p).toArray() as Cycle;
}

type Graphics = {
    type: 'circle',
    x: number, y: number,
    r: number
} | {
    type: 'line',
    angle: number, distance: number
} | {
    type: 'point',
    x: number, y: number
} | {
    type: 'infinity'
}

function render([p1,p2,p3,p4,p5]: Cycle) : Graphics {
    if (math.abs(p4) < 1e-15) {
        if (p2*p2 + p3*p3 < 1e-15) {
            return {type: 'infinity'};
        }
        return {
            type: 'line',
            angle: Math.atan2(-p2/p1, p3/p1), distance:p5/p1
        };
    } else if (math.abs(p1/p4) < 1e-15) {
        return {
            type: 'point',
            x: -p2/p4, y: -p3/p4
        };
    } else {
        return {
            type: 'circle',
            x: -p2/p4, y:-p3/p4,
            r: -p1/p4  // note the orientation
        };
    }
}

const canvas = document.getElementById("canvas");
const outer = document.getElementById("outer");
if (canvas === null || outer === null) {
    throw new Error("Canvas not found :(");
}

const cycles: Cycle[] = [
    circle(-1, -1, 1),
    circle(0, 0, 1),
    circle(0,0,0.5),
    point(0,0),
    point(1,0),
    point(-1,0),
    point(0,1),
    point(0,-1),
    line(0, 0), line(0, 1), line(0,-1),
    line(Math.PI/6, 0),
    line(Math.PI/3, 0),
    line(Math.PI/2, 0),
    line(2*Math.PI/3,0),
    line(5*Math.PI/6,0)
];  // List of actual coordinates
const currentTransform: LieTransform = [0,0,0,0,0,0,0,0,0,0];

function display() {
    canvas?.replaceChildren();
    for (const cycle of cycles) {
        const graph = render(transform(currentTransform, cycle));
        if (graph.type === "circle") {
            const circle = document.createElement('div');
            circle.className = "circle";
            circle.setAttribute('style',
                `--radius: ${Math.abs(graph.r)*Length}px; --x: ${graph.x*Length}px; --y: ${graph.y*Length}px;
                border-color: ${graph.r > 0 ? "red" : "blue"}`);
            canvas?.appendChild(circle);
        } else if (graph.type === "line") {
            const line = document.createElement('div');
            line.className = "line";
            line.setAttribute('style',
                `--angle: ${graph.angle}rad; --distance: ${graph.distance*Length}px`);
            canvas?.appendChild(line);
        } else if (graph.type === "point") {
            const point = document.createElement('div');
            point.className = "point";
            point.setAttribute('style',
                `--x: ${graph.x*Length}px; --y: ${graph.y*Length}px`);
            canvas?.appendChild(point);
        }  // Can't draw infinity
    }
}


outer.addEventListener('click', (ev) => {
    cycles.push(transform(inverse(currentTransform), point(
        (ev.offsetX - outer.clientWidth/2)/Length,
        (ev.offsetY - outer.clientHeight/2)/Length)));
    display();
});

const isKeyDown = (() => {
    const state : Map<string, boolean> = new Map();

    window.addEventListener('keyup', (e) => state.set(e.key, false));
    window.addEventListener('keydown', (e) => state.set(e.key, true));

    return (key: string) => state.has(key) ? state.get(key) : false;
})();

display();
setInterval(() => {
    for (const u of [0,1,2,3,4,5,6,7,8,9]) {
        if (isKeyDown(u.toString())) {
            currentTransform[u] += isKeyDown(" ") ? -0.01 : 0.01;
            display();
        }
    }
}, 16);
