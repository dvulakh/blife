
/*** CONSTANTS ***/
// Interface constants
var MAX_PROP = 0.25;
var STEP = 0.05;
var MENU_PROP = 0.075;
var IMPORT_MENU_PROP = 0.02;
var BUTTON_PROP = 0.6;
var BUTTON_PAD = 5;
var PROP = 20;
var BUTTON_OUTLINE = 2;
var BUTTON_LABEL_PROP = 0.5;
var STAT_PROP = 0.02;
var STAT_LN = 1.2;
var STAT_WD = 0.55;
var SLIDE_HEIGHT = 3;
var SLIDE_BALL = 0.4;
var SLIDE_EXTRA_PAD = 0.05;
var SKIP_GEN = 100;
var IMPORT_MENU_WID = 10;
var CENTER_PAD = [0.6, 0.3];
var SQR_PAD = 0.2;
var MENU_H = 16;
// Logic constants
var UP = [[0, -1], [1, -2]];
var DOWN = [[0, 1], [-1, 2]];
var LEFT = [[-1, 0], [-1, 0]];
var RIGHT = [[1, 0], [1, 0]];
var LIFESTR = "2 0 0 1\n3\n0 5 1\n1 5 1\n1 6 1\n1 1 0 0 0\n#000000 #00FF00\n0 0 40 40\nConway's Game of Life\n";
var WIREWORLDSTR = "4 0 0 1\n5\n1 -1 -1 -1 1\n2 -1 -1 -1 3\n3 -1 -1 -1 1\n1 -1 -1 1 2\n1 -1 -1 2 2\n1 1 0 0 0\n#000000 #FFC000 #0000FF #FF0000\n0 0 40 40\nWireworld\n";
var HEXSTR = "2 0 0 2\n3\n0 4 1\n1 2 1\n1 3 1\n1 1 0 0 0\n#000000 #00FF00\n0 0 50 50\nHex Life\n";
var CANCEL_ID = "-1";
var CUSTOM_ID = "?";
var DIR_ID = "#";
var WIREWORLD;
var HEXLIFE;
var LIFE;
// Graphics globals
var HEX_VERT = [[0, 1], [Math.sqrt(3) / 2, 0.5], [Math.sqrt(3) / 2, -0.5], [0, -1], [-Math.sqrt(3) / 2, -0.5], [-Math.sqrt(3) / 2, 0.5]];
var MOORE_NEIGH = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
var VN_NEIGH = [[0, -1], [1, 0], [0, 1], [-1, 0]];
var ORIG_ZOOM = [0.01, 0.1, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 400, 500, 1000, 1500, 2000, 2500, 3000];
var FILE_PREFIX = "blife/";
var MENU_PASTE = false;
var tim = new Date();
var ZOOM_ARR = ORIG_ZOOM;
var SHOW_STATS = true;
var PASTING = false;
var LINE_WIDTH = 1;
var MOVED = false;
var PAINT_COL = -1;
var PANNING = true;
var HEX_FACT = 2;
var PAUSE = 100;
var PAUSE_ARR = [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 1];
var QUEUED = true;
var PAUSE_PAD = 100;
var ACT = true;
var MIN_SZ = 1;
var START = false;
var SPECIAL_START = true;
var IMPORT_PAUSE = 200;
var HIS = 30;
var MP = 0;
var sub;
// Colors
var GRAD = ["0000FF", "000010"];
var MENU_BORDERS = "#909090";
var DARK_MENU_BORDERS = "#202020";
var GRID_COL = "#303030";
var DARK_GRID_COL = "#E0E0E0"
var TEXT_COL = "#D0D0D0";
var DARK_TEXT_COL = "#202020";
var MENU_BUT = "#909090";
var DARK_MENU_BUT = "#505050";
var MENU_BUT_MSD = "#D0D0D0";
var DARK_MENU_BUT_MSD = "#202020"
var MONO_FONT = "Ubuntu Mono";
var HOVER_FONT = "Ubuntu";

/*** GLOBALS ***/
var ctx = canvas.getContext("2d");
var rule = 0;
var lmx, lmy;
var nmx, nmy;
var mx, my;
var drw;
var mpc;
var gr;

/*** LOAD FONTS ***/
(function() {
   var wf = document.createElement('script');
   wf.src = ('https:' == document.location.protocol ? 'https' : 'http') +
       '://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
   var s = document.getElementsByTagName('script')[0];
   s.parentNode.insertBefore(wf, s);
 })();
 
WebFontConfig = {
  google: { families: ['Material Icons', MONO_FONT, HOVER_FONT] },
  active: function() { ACT = false }
};

/*** TRIE ***/
class Node {
    constructor(sz) {
        this.ch = new Array(sz + 1).fill(null);
        this.line = -1;
        this.val = -1;
    }
    insert(p, v, l) {
        if (p.length == 0) {
            this.line = l;
            this.val = v;
        }
        else {
            if (this.ch[p[0] + 1] == null)
                this.ch[p[0] + 1] = new Node(this.ch.length);
            this.ch[p.shift() + 1].insert(p, v, l);
        }
    }
    get(p) {
        if (p.length == 0)
            return this;
        var l = null, r = null;
        p = p.slice(0);
        var p0 = p.shift();
        if (this.ch[0] != null)
            l = this.ch[0].get(p);
        if (this.ch[p0 + 1] != null)
            r = this.ch[p0 + 1].get(p);
        return l != null ? r != null ? l.line > r.line ? l : r : l : r;
    }
}

/*** GAME OF LIFE FRAMEWORK ***/

// Cell object holds information about a single cell
class Cell {
    constructor(col, grid, pos) {
        this.grid = grid;
        this.col = col;
        this.pos = pos;
    }
    neigh() { return this.grid.neigh(this) }
}

// Rules object holds information for going from one generation to the next
class Rules {
    constructor(ncol, step, vnadj, ordered, nr, name) {
        this.ordered = ordered;
        this.vnadj = vnadj;
        this.ncol = ncol;
        this.step = step;
        this.his = gr != null ? gr.rule.his : 0;
		this.name = name;
        this.nr = nr;
    }
    // Apply rule to cell
    apply(cell) {
        var r;
        if (this.ordered)
            r = this.step.get([Math.max(cell.col, 0)].concat(cell.neigh().map(function(e) { return Math.max(e.col, 0); })));
        else {
            var adj = [];
            for (var i = 0; i < this.ncol; i++)
                adj[i] = 0;
            cell.neigh().forEach(function(n) {
                adj[Math.max(n.col, 0)]++;
            });
            adj.pop();
            r = this.step.get([Math.max(cell.col, 0)].concat(adj));
        }
        if (r != null && r.val != 0)
            cell.grid.insert(new Cell(r.val, cell.grid, cell.pos), false);
        else if (cell.col > 0 && this.his > 0)
            cell.grid.insert(new Cell(-1, cell.grid, cell.pos), false);
        else if (cell.col < 0 && -cell.col < this.his)
            cell.grid.insert(new Cell(cell.col - 1, cell.grid, cell.pos), false);
    }
};

// Grid object holds current arrangement of states
class Grid {
    constructor(cells, rule, gen) {
        this.nextcells = new Map();
        this.oldcells = new Map();
        this.cells = cells;
        this.rule = rule;
        this.gen = gen;
    }
    nneigh() {}
    gtype() {}
    insert(c, n) {}
    set(x, y, c) {}
    get(x, y) {}
    stateAt(x, y) {}
    neigh(c) {}
    nextGen() {}
    prod(x, y) {}
    to_string() {}
    line(c1, c2) {}
};

// SquareGrid implements rules on a square grid
class SquareGrid extends Grid {
    nneigh() { return this.rule.vnadj ? 4 : 8; }
    gtype() { return 1; }
    insert(c, n) {
        c.pos[0] = Math.floor(c.pos[0]);
        c.pos[1] = Math.floor(c.pos[1]);
        var mp = this.nextcells
        if (n)
            mp = this.cells
        mp.delete(zip(c.pos[0], c.pos[1]));
        mp.set(zip(c.pos[0], c.pos[1]), c);
    }
    set(x, y, c) { this.insert(new Cell(c, this, [x, y]), true); }
    get(x, y) {
        x = Math.floor(x); y = Math.floor(y);
        if (this.cells.has(zip(x, y)))
            return this.cells.get(zip(x, y));
        return new Cell(0, this, [x, y]);
    }
    neigh(c) {
        var n = [];
        var v = this.rule.vnadj ? VN_NEIGH : MOORE_NEIGH;
        v.forEach(function(s) {
            n.push(gr.get(c.pos[0] + s[0], c.pos[1] + s[1]));
        });
        return n;
    }
    stateAt(x, y) {
        return this.get(x, y).col;
    }
    nextGen() {
        this.nextcells = new Map();
        var ovals = [];
        for (var c of this.cells.values())
            ovals.push(c);
        ovals.forEach(function(c) {
            c.neigh().forEach(function(n) {
                if (n.col === 0)
                    n.grid.cells.set(zip(n.pos[0], n.pos[1]), n);
            });
        });
        for (var c of this.cells.values())
            this.rule.apply(c);
        this.oldcells = this.cells;
        this.cells = this.nextcells;
        this.gen++;
    }
    to_string() {
        var minx = 0.5, miny = 0.5, maxx = 0.5, maxy = 0.5;
        for (var c of this.cells.values())
            if (c.col > 0) {
                minx = minx == 0.5 ? c.pos[0] : Math.min(minx, c.pos[0]);
                miny = miny == 0.5 ? c.pos[1] : Math.min(miny, c.pos[1]);
                maxx = maxx == 0.5 ? c.pos[0] : Math.max(maxx, c.pos[0]);
                maxy = maxy == 0.5 ? c.pos[1] : Math.max(maxy, c.pos[1]);
            }
        if (minx == 0.5)
            return "1 1 0 0\n0\n";
        var s = (maxx - minx + 1) + " " + (maxy - miny + 1) + " " + minx + " " + miny + "\n";
        for (var y = miny; y <= maxy; y++) {
            for (var x = minx; x <= maxx; x++)
                s += Math.max(0, this.stateAt(x, y)) + (x == maxx ? "" : " ");
            s += "\n";
        }
        return s;
    }
    line(c1, c2) {
        var l = [];
        var dx = c2.pos[0] - c1.pos[0], dy = c2.pos[1] - c1.pos[1];
        if (dx == 0)
            for (var y = c1.pos[1]; y != c2.pos[1]; y += Math.sign(dy))
                l.push(this.get(c1.pos[0], y));
        else {
            var de = Math.abs(dy / dx), e = 0, y = c1.pos[1];
            for (var x = c1.pos[0]; x != c2.pos[0]; x += Math.sign(dx)) {
                l.push(this.get(x, y));
                e += de;
                do {
                    if (e >= 0.5) {
                        y += Math.sign(dy);
                        e--;
                    }
                    if (e >= 0.5)
                        l.push(this.get(x, y));
                } while(e >= 0.5);
            }
        }
        return l;
    }
    census() {
        var l = new Array(this.rule.ncol + 1).fill(0);
        for (var c of this.cells.values())
            l[Math.max(-1, c.col) + 1]++;
        return l;
    }
	fix() {
		var minx = 0.5, miny = 0.5, maxx = 0.5, maxy = 0.5;
        for (var c of this.cells.values())
            if (c.col > 0)
                minx = minx == 0.5 ? c.pos[0] : Math.min(minx, c.pos[0]), miny = miny == 0.5 ? c.pos[1] : Math.min(miny, c.pos[1]), maxx = maxx == 0.5 ? c.pos[0] : Math.max(maxx, c.pos[0]), maxy = maxy == 0.5 ? c.pos[1] : Math.max(maxy, c.pos[1]);
		var l = [];
		for (var c of this.cells.values())
			l.push(c);
		this.cells = new Map();
		l.forEach(function(e) { this.set(e.pos[0] - minx, e.pos[1] - miny, e.col); }, this);
		return [maxx - minx + 1, maxy - miny + 1];
	}
	trans(delta) {
		var l = [];
		for (var c of this.cells.values())
			l.push(c);
		this.cells = new Map();
		l.forEach(function(e) { this.set(delta(e.pos)[0], delta(e.pos)[1], e.col); }, this);
		this.fix();
	}
}

// Hexgrids are actually similar to square ones
class HexGrid extends SquareGrid {
    nneigh() { return 6; }
    gtype() { return 2; }
    neigh(c) {
        var n = [];
        for (var i = -1; i <= 1; i++)
            for (var j = -1; j <= 1; j++)
            if ((i != 0 || j != 0) && (i * j <= 0)) {
                if (this.cells.has(zip(c.pos[0] + i, c.pos[1] + j)))
                    n.push(this.cells.get(zip(c.pos[0] + i, c.pos[1] + j)));
                else
                    n.push(new Cell(0, this, [c.pos[0] + i, c.pos[1] + j]));
            }
        return n;
    }
}

/*** GRAPHICS ***/

// GridDrawer draws the grid
class GridDrawer {
    constructor(grid, dim, celldim, pos, cols, glcol, circle, grad, lines) {
        this.celldim = celldim;
        this.circle = circle;
        this.glcol = glcol;
		this.lines = lines;
        this.pause = true;
        this.cols = cols;
        this.grid = grid;
        this.grad = grad;
        this.raw = true;
        this.aux = null;
        this.aps = null;
        this.dim = dim;
        this.pos = pos;
		this.drw = false;
    }
    dlines() { return this.lines && this.celldim.x > MIN_SZ && this.celldim.y > MIN_SZ; }
    rend(loc, dim, c) {}
    gridLines() {}
    cellAt(x, y) {}
    auxShift(c) {
        return [Math.floor(c.pos[0]) - Math.floor(this.aps[0]) + Math.floor(this.cellAt(mx, my)[0]), Math.floor(c.pos[1]) - Math.floor(this.aps[1]) + Math.floor(this.cellAt(mx, my)[1])];
    }
    shade(h) {
        if (isNaN(h) || this.grid.rule.his <= 0)
            return this.cols[0];
        if (h == 1)
            return "#" + this.grad[0];
        var c = (Math.floor((h - 1) * (parseInt(this.grad[1], 16) - parseInt(this.grad[0], 16)) / (this.grid.rule.his - 1)) + parseInt(this.grad[0], 16)).toString(16);
        return "#" + "0".repeat(6 - c.length) + c;
    }
    draw() {
		this.drw = false;
		this.glcol = isDark(this.cols[0]) ? GRID_COL : DARK_GRID_COL;
        if (this.raw) {
            ctx.fillStyle = this.cols[0];
            ctx.fillRect(0, 0, this.dim.x, this.dim.y);
            this.gridLines();
            this.raw = false;
        }
        for (var c of this.grid.oldcells.values())
            this.rend([c.pos[0] - this.pos[0], c.pos[1] - this.pos[1]], this.celldim, this.cols[0]);
        for (var c of this.grid.cells.values())
            if (c.col == 0)
                this.rend([c.pos[0] - this.pos[0], c.pos[1] - this.pos[1]], this.celldim, this.cols[0]);
        for (var c of this.grid.cells.values())
            if (c.col < 0)
                this.rend([c.pos[0] - this.pos[0], c.pos[1] - this.pos[1]], this.celldim, this.shade(-c.col));
        for (var c of this.grid.cells.values())
            if (c.col > 0)
                this.rend([c.pos[0] - this.pos[0], c.pos[1] - this.pos[1]], this.celldim, this.cols[c.col]);
        if (this.aux != null)
            for (var c of this.aux.cells.values())
                if (!PASTING || c.col != 0) {
                    var sh = PASTING ? this.auxShift(c) : c.pos;
                    this.rend([sh[0] - this.pos[0], sh[1] - this.pos[1]], this.celldim, this.cols[Math.min(c.col, this.grid.rule.ncol - 1)] + "50");
                    if (this.grid.get(sh[0], sh[1]).col == 0)
                        this.grid.set(sh[0], sh[1], 0);
                }
        mx = nmx;
        my = nmy;
    }
    move(dir, b) {
        var step = Math.max(Math.floor(STEP * drw.dim.x / drw.celldim.x), 1);
        step = !b ? [step * dir[0], step * dir[1]] : dir;
        var l = [];
        for (var c of this.grid.cells.values())
            l.push(c);
        l.forEach(function(c) {
            if (drw.grid.get(c.pos[0] + step[0], c.pos[1] + step[1]).col == 0)
                drw.grid.set(c.pos[0] + step[0], c.pos[1] + step[1], 0);
        });
        this.pos[0] += step[0];
        this.pos[1] += step[1];
    }
    center() { return this.cellAt(this.dim.x / 2, this.dim.y / 2); }
    getAll() {}
    zoom(step) {
        var oc = this.center();
		var i;
		for (i = 0; i < ZOOM_ARR.length; i++)
			if (ZOOM_ARR[i] >= this.celldim.x)
				break;
		i = Math.min(Math.max(0, i + step), ZOOM_ARR.length - 1);
		this.celldim.x = ZOOM_ARR[i];
		this.celldim.y = ZOOM_ARR[i];
        /*if (this.celldim.x == MIN_SZ && step < 0) {
            this.celldim.x = SUB_ZOOM[0];
            this.celldim.y = SUB_ZOOM[0];
        }
        else if (this.celldim.x < MIN_SZ && step < 0) {
            var i;
            for (i = 0; i < SUB_ZOOM.length - 1; i++)
                if (SUB_ZOOM[i] < this.celldim.x)
                    break;
            this.celldim.x = SUB_ZOOM[i];
            this.celldim.y = SUB_ZOOM[i];
        }
        else if (this.celldim.x == SUB_ZOOM[0] && step > 0) {
            this.celldim.x = MIN_SZ;
            this.celldim.y = MIN_SZ;
        }
        else if (this.celldim.x < MIN_SZ && step > 0) {
            var i;
            for (i = SUB_ZOOM.length - 1; i > 0; i--)
                if (SUB_ZOOM[i] > this.celldim.x)
                    break;
            this.celldim.x = SUB_ZOOM[i];
            this.celldim.y = SUB_ZOOM[i];
        }
        else {
            step = step / Math.abs(step) * Math.floor(Math.max(ZOOM_STEP * this.celldim.x, 1));
            this.celldim.x = Math.max(this.celldim.x + step, MIN_SZ);
            this.celldim.y = Math.max(this.celldim.y + step, MIN_SZ);
        }*/
        var nc = this.center();
        this.pos[0] += oc[0] - nc[0];
        this.pos[1] += oc[1] - nc[1];
        this.raw = true;
		return i;
    }
    randFill() {
        this.getAll().forEach(function(c) {
            drw.grid.set(c.pos[0], c.pos[1], Math.floor(Math.random() * drw.grid.rule.ncol));
        });
    }
    to_string() {
        var s = "";
        s += this.grid.rule.ncol + " " + (this.grid.rule.vnadj ? 1 : 0) + " " + (this.grid.rule.ordered ? 1 : 0) + " " + this.grid.gtype() + "\n" + this.grid.rule.nr + "\n";
        stringify(this.grid.rule.step, "", new Array(this.grid.rule.nr).fill("")).forEach(function(e) { s += e; })
        s += this.grid.to_string();
        this.cols.forEach(function(e) {
            s += e + " ";
        });
        s += "\n" + this.pos[0] + " " + this.pos[1] + " " + this.celldim.x + " " + this.celldim.y + "\n" + this.grid.rule.name + "\n";
        return s;
    }
    paste() {
        for (var c of this.aux.cells.values())
            if (!PASTING || c.col != 0) {
                var p = PASTING ? this.auxShift(c) : c.pos;
                this.grid.set(p[0], p[1], Math.min(c.col, this.grid.rule.ncol - 1));
            }
    }
	recenter() {
		var dims = this.grid.fix();
		this.celldim.x = ZOOM_ARR[ZOOM_ARR.length - 1], this.celldim.y = this.celldim.x;
		while ((CENTER_PAD[this.grid.gtype() - 1] * canvas.width / this.celldim.x < dims[0] || CENTER_PAD[this.grid.gtype() - 1] * canvas.height / this.celldim.y < dims[1]) && this.celldim.x != ZOOM_ARR[0])
			ZOOM_S.dwn_step();
		while (this.celldim.x > Math.min(canvas.width, canvas.height) / PROP)
			ZOOM_S.dwn_step();
		this.pos = [dims[0] / 2 - canvas.width / 2 / this.celldim.x, dims[1] / 2 - canvas.height / 2 / this.celldim.y];
	}
};

// Draw a line
var linRend = function(c1, c2) {
    ctx.moveTo(c1.x, c1.y);
    ctx.lineTo(c2.x, c2.y);
}

// Draw a hex
var mkHex = function(loc, dim) {
    ctx.beginPath();
    dim = dim / Math.sqrt(3);
    HEX_VERT.forEach(function(v) {
        nxt = [/*Math.floor*/(loc[0] + dim * v[0]), /*Math.floor*/(loc[1] + dim * v[1])];
        if (zip(v[0], v[1]) == zip(HEX_VERT[0][0], HEX_VERT[0][1]))
            ctx.moveTo(nxt[0], nxt[1]);
        else
            ctx.lineTo(nxt[0], nxt[1]);
    });
    ctx.closePath();    
}

// Fill a circle
var flCir = function(pos, rad) {
    ctx.beginPath();
    ctx.arc(pos[0], pos[1], rad, 0, 2 * Math.PI);
    ctx.fill();
}

// SquareGridDrawer draws a square grid
class SquareGridDrawer extends GridDrawer {
    getAll() {
        var a = []
        var gdim = {x: Math.floor(this.dim.x / this.celldim.x), y: Math.floor(this.dim.y / this.celldim.y)};
        for (var i = 0; i <= gdim.x; i++)
            for (var j = 0; j <= gdim.y; j++)
                a.push(this.grid.get(Math.floor(this.pos[0]) + i, Math.floor(this.pos[1]) + j))
        return a;
    }
    rend(loc, dim, c) {
        ctx.fillStyle = c;
        if (this.circle && c != this.cols[0] && this.celldim.x > 2) {
            this.rend(loc, dim, this.cols[0]);
            ctx.fillStyle = c;
            flCir([Math.floor(loc[0] * dim.x) + dim.x / 2 + 0.5, Math.floor(loc[1] * dim.y) + dim.x / 2 + 0.5], Math.max(Math.floor(dim.x / 2) - 2, 1));
        }
        else
            ctx.fillRect(Math.sign(loc[0]) * (Math.ceil(Math.abs(loc[0]) % 1 * dim.x) + Math.floor(Math.abs(loc[0])) * dim.x) + (loc[0] < 0 && loc[0] % 1 != 0 ? 1 : 0), Math.sign(loc[1]) * (Math.ceil(Math.abs(loc[1]) % 1 * dim.y) + Math.floor(Math.abs(loc[1])) * dim.y) + (loc[1] < 0 && loc[1] % 1 != 0 ? 1 : 0), Math.max(dim.x, MIN_SZ), Math.max(dim.y, MIN_SZ));
        if (this.dlines()) {
            ctx.lineWidth = LINE_WIDTH;
            ctx.strokeStyle = this.glcol;
            ctx.strokeRect(Math.sign(loc[0]) * (Math.ceil(Math.abs(loc[0]) % 1 * dim.x) + Math.floor(Math.abs(loc[0])) * dim.x) + 0.5 + (loc[0] < 0 && loc[0] % 1 != 0 ? 1 : 0), Math.sign(loc[1]) * (Math.ceil(Math.abs(loc[1]) % 1 * dim.y) + Math.floor(Math.abs(loc[1])) * dim.y) + 0.5 + (loc[1] < 0 && loc[1] % 1 != 0 ? 1 : 0), dim.x, dim.y);
        }
    }
    gridLines() {
        if (!this.dlines())
            return;
        ctx.beginPath();
        ctx.lineWidth = LINE_WIDTH;
        ctx.strokeStyle = this.glcol;
        var gdim = {x: Math.floor(this.dim.x / this.celldim.x), y: Math.floor(this.dim.y / this.celldim.y)};
        for (var i = 0; i <= gdim.x + 1; i++)
            linRend({x: i * this.celldim.x - Math.floor(this.pos[0] % 1 * this.celldim.x) + 0.5, y: 0}, {x: i * this.celldim.x - Math.floor(this.pos[0] % 1 * this.celldim.x) + 0.5, y: this.dim.y});
        for (var i = 0; i <= gdim.y + 1; i++)
            linRend({x: 0, y: i * this.celldim.y - Math.floor(this.pos[1] % 1 * this.celldim.y) + 0.5}, {x: this.dim.x, y: i * this.celldim.y - Math.floor(this.pos[1] % 1 * this.celldim.y) + 0.5});
        ctx.stroke();
    }
    cellAt(x, y) { return [this.pos[0] + (x / this.celldim.x), this.pos[1] + (y / this.celldim.y)]; }
    move(dir, b) { super.move(dir[0], b); }
};

class HexGridDrawer extends GridDrawer {
    get pad() { return [1, Math.sqrt(3) / 2]; }
    get bas() { return [[1, 0], [0.5, Math.sqrt(3) / 2]]; }
    getAll() {
        var a = []
        var gdim = {x: this.dim.x / this.celldim.x, y: this.dim.y / this.celldim.x / this.bas[1][1]};
        for (var i = -1; i <= gdim.x; i++)
            for (var j = -1; j <= gdim.y; j++)
                a.push(this.grid.get(i - Math.floor((j + 1) / 2) + Math.floor(this.pos[0]), j + Math.floor(this.pos[1])));
        return a;
    }
    gridLines() {
        if (!this.dlines())
            return;
        var gdim = {x: this.dim.x / this.celldim.x, y: this.dim.y / this.celldim.x / this.bas[1][1]};
        for (var i = -1; i <= gdim.x; i++)
            for (var j = -1; j <= gdim.y; j++)
                this.rend([i - Math.floor((j + 1) / 2) - this.pos[0] % 1, j - this.pos[1] % 1], this.celldim, 0);
    }
    rend(loc, dim, c) {
        dim = dim.x;
        ctx.fillStyle = c;
        var cnt = [this.pad[0] + loc[0] * this.bas[0][0] + loc[1] * this.bas[1][0], this.pad[1] + loc[0] * this.bas[0][1] + loc[1] * this.bas[1][1]];
        cnt = [cnt[0] * dim, cnt[1] * dim];
        if (this.circle && c != this.cols[0] && this.celldim.x > 1)
            flCir(cnt, dim / 2);
        else if (c == this.cols[0] && !this.lines)
            flCir(cnt, dim * Math.sqrt(3) / 2);
        else {
            mkHex(cnt, dim + 1);
            ctx.fill();
        }
        if (this.dlines()) {
            ctx.lineWidth = LINE_WIDTH * HEX_FACT;
            ctx.strokeStyle = this.glcol;
            mkHex(cnt, dim);
            ctx.stroke();
        }
    }
    cellAt(x, y) {
        x -= this.celldim.x * this.pad[0]; y -= this.celldim.x * this.pad[1];
        var ny = y * 2 / Math.sqrt(3);
        var nx = x - ny / 2;
        return [this.pos[0] + (nx / this.celldim.x + 0.5), this.pos[1] + (ny / this.celldim.x + 0.5)];
    }
    move(dir, b) { super.move(dir[1], b); }
}

// Draw Text
var write = function(txt, a, x, y) {
    w = txt.split('\n');
    var d = 0, sz = Math.floor(STAT_PROP * canvas.height);
    w.forEach(function(s) { d = Math.max(d, s.length); });
    d = (d + 1) * sz * STAT_WD;
    ctx.fillStyle = drw.cols[0];
    ctx.fillRect(x - (a == "left" ? 0 : (d + sz)), y - STAT_LN * sz * (w.length + 1), d + sz, STAT_LN * sz * (w.length + 1));
    ctx.font = sz + "px " + MONO_FONT;
    ctx.fillStyle = isDark(drw.cols[0]) ? TEXT_COL : DARK_TEXT_COL;
    ctx.textAlign = a;
    for (var i = w.length - 1; i >= 0; i--)
        ctx.fillText(w[i], x + (a == "left" ? sz : -sz), y - STAT_LN * sz * (w.length - i) + 5);
}

/*** COLOR PICKER ***/
class Picker {
	constructor(pos, dim, vis) {
		this.pos = pos;
		this.dim = dim;
		this.vis = vis;
	}
	in_this(ev) { return ev.x >= this.pos[0] && ev.y >= this.pos[1] && ev.x <= this.pos[0] + this.dim.x && ev.y <= this.pos[1] + this.dim.y; }
	rend() {
		this.pos = [COLOR_PICK_BUT.pos[0] - BUTTON_OUTLINE, MENU_PROP * canvas.height + 1]
		this.dim = {x:COLOR_PICK_BUT.dim.x + 2 * BUTTON_OUTLINE, y: (COLOR_PICK_BUT.dim.y + 2 * BUTTON_OUTLINE) * Math.min(MENU_H, gr.rule.ncol)};
		if (!this.vis)
			return;
		ctx.fillStyle = drw.cols[0];
		ctx.strokeStyle = isDark(drw.cols[0]) ? MENU_BORDERS : DARK_MENU_BORDERS;
		ctx.lineWidth = 1;
		ctx.fillRect(this.pos[0], this.pos[1], this.dim.x, this.dim.y);
		ctx.strokeRect(this.pos[0] + 0.5, this.pos[1] + 0.5, this.dim.x, this.dim.y);
		for (var i = 0; i < Math.min(MENU_H, gr.rule.ncol); i++) {
			ctx.fillStyle = drw.cols[i];
			ctx.fillRect(Math.floor(this.pos[0] + SQR_PAD * this.dim.x), Math.floor(this.pos[1] + SQR_PAD * this.dim.x + i * this.dim.x), Math.ceil(this.dim.x * (1 - 2 * SQR_PAD)), Math.ceil(this.dim.x * (1 - 2 * SQR_PAD)));
			ctx.strokeRect(Math.floor(this.pos[0] + SQR_PAD * this.dim.x) + 0.5, Math.floor(this.pos[1] + SQR_PAD * this.dim.x + i * this.dim.x) + 0.5, Math.ceil(this.dim.x * (1 - 2 * SQR_PAD)), Math.ceil(this.dim.x * (1 - 2 * SQR_PAD)));
		}
		if (this.in_this(new MouseEvent("", {clientX: nmx, clientY: nmy}))) {
			var sel = Math.floor((nmy - this.pos[1]) / this.dim.x);
			ctx.strokeStyle = isDark(drw.cols[0]) ? MENU_BUT : DARK_MENU_BUT;
			ctx.lineWidth = 2;
			ctx.strokeRect(Math.floor(this.pos[0] + SQR_PAD * this.dim.x) - 1.5, Math.floor(this.pos[1] + SQR_PAD * this.dim.x + sel * this.dim.x) - 1.5, Math.ceil(this.dim.x * (1 - 2 * SQR_PAD)) + 4, Math.ceil(this.dim.x * (1 - 2 * SQR_PAD)) + 4);
			ctx.fillStyle = isDark(drw.cols[0]) ? MENU_BUT_MSD : DARK_MENU_BUT_MSD;
			ctx.textAlign = "center", ctx.font = Math.floor(BUTTON_LABEL_PROP * (MENU_PROP * canvas.height - COLOR_PICK_BUT.dim.y)) + "px " + HOVER_FONT;
			if (PANNING && sel == 0)
				ctx.fillText("toggle all", COLOR_PICK_BUT.pos[0] + COLOR_PICK_BUT.dim.x / 2, Math.floor(MENU_PROP * canvas.height - (1 - BUTTON_LABEL_PROP) * (MENU_PROP * canvas.height - COLOR_PICK_BUT.dim.y) / 2));
			else
				ctx.fillText((PANNING ? "toggle " : "") + "state " + sel, COLOR_PICK_BUT.pos[0] + COLOR_PICK_BUT.dim.x / 2, Math.floor(MENU_PROP * canvas.height - (1 - BUTTON_LABEL_PROP) * (MENU_PROP * canvas.height - COLOR_PICK_BUT.dim.y) / 2));
		}
		ctx.strokeStyle = isDark(drw.cols[0]) ? MENU_BUT_MSD : DARK_MENU_BUT_MSD;
		ctx.lineWidth = 2;
		ctx.strokeRect(Math.floor(this.pos[0] + SQR_PAD * this.dim.x) - 1.5, Math.floor(this.pos[1] + SQR_PAD * this.dim.x + Math.max(0, PAINT_COL) * this.dim.x) - 1.5, Math.ceil(this.dim.x * (1 - 2 * SQR_PAD)) + 4, Math.ceil(this.dim.x * (1 - 2 * SQR_PAD)) + 4);
	}
	click_check(ev) {
		if (this.in_this(ev) && this.vis)
			PAINT_COL = Math.floor((nmy - this.pos[1]) / this.dim.x);
	}
}
var PICKER = new Picker(null, null, false);
var pick_col = function() {
	PICKER.vis = !PICKER.vis;
	drw.raw = true;
}

/*** BUTTON ***/
class Button {
	constructor(rendchar, hover, clickaction, pos, dim, togn, togs) {
		this.clickaction = clickaction;
		this.rendchar = rendchar;
		this.hover = hover;
		this.msd = false;
		this.togn = togn;
		this.togs = togs;
		this.pos = pos;
		this.dim = dim;
	}
	rend() {
		if (this == FPASTE_BUT)
			this.togs = PASTING ? 1 : 0;
		if (this == ABOUT_BUT)
			this.togs = $("#about").css("z-index") > 0 ? 1 : 0;
		ctx.lineWidth = BUTTON_OUTLINE;
		var col = isDark(drw.cols[0]) ? this.msd ? MENU_BUT_MSD : MENU_BUT : this.msd ? DARK_MENU_BUT_MSD : DARK_MENU_BUT;
		ctx.strokeStyle = col;
		ctx.strokeRect(this.pos[0], this.pos[1], this.dim.x, this.dim.y);
		ctx.fillStyle = col;
		ctx.textAlign = "center";
		ctx.font = Math.floor(this.dim.y - BUTTON_PAD) + "px Material Icons";
		ctx.fillText(this.rendchar[this.togs], this.pos[0] + this.dim.x / 2, this.pos[1] + this.dim.y - BUTTON_PAD / 2);
		if (this.msd) {
			if (TOP_BUTTON.includes(this)) {
				ctx.font = Math.floor(BUTTON_LABEL_PROP * (MENU_PROP * canvas.height - this.dim.y)) + "px " + HOVER_FONT;
				ctx.fillText(this.hover[this.togs], this.pos[0] + this.dim.x / 2, Math.floor(MENU_PROP * canvas.height - (1 - BUTTON_LABEL_PROP) * (MENU_PROP * canvas.height - this.dim.y) / 2));
			}
			else {
				ctx.font = Math.floor(BUTTON_LABEL_PROP * (MENU_PROP * canvas.height - this.dim.y)) + "px " + HOVER_FONT;
				ctx.fillText(this.hover[this.togs], this.pos[0] + this.dim.x / 2, Math.ceil((1 - MENU_PROP) * canvas.height + (1 - BUTTON_LABEL_PROP) * (MENU_PROP * canvas.height - this.dim.y)) + 1);
			}
		}
	}
	in_this(ev) { return ev.x >= this.pos[0] && ev.y >= this.pos[1] && ev.x <= this.pos[0] + this.dim.x && ev.y <= this.pos[1] + this.dim.y; }
	do_click() {
		this.togs = (this.togs + 1) % this.togn;
		this.clickaction();
	}
	move_check(ev) { this.msd = this.in_this(ev); }
	click_check(ev) {
		if (this.in_this(ev))
			this.do_click();
	}
}
// Buttons
var FOPEN_BUT = new Button(["folder"], ["load life"], function() { importmenu(false); }, [10, 10], {x: 50, y: 50}, 1, 0);
var FPASTE_BUT = new Button(["image_aspect_ratio", "clear"], ["paste life", "cancel paste"], function() { if (PASTING) {drw.aux = null; PASTING = false; MP = 0; drw.raw = true;} else importmenu(true); }, [10, 10], {x: 50, y: 50}, 2, 0);
var FSAVE_BUT = new Button(["save"], ["save life"], function() { exportf(); }, [10, 10], {x: 50, y: 50}, 1, 0);
//var PALETTE = new Button(["palette"], ["a"], function() { alert("yippe!"); }, [10, 10], {x: 50, y: 50}, 1, 0);
var BRUSH_BUT = new Button(["pan_tool", "brush"], ["paint life", "drag life"], function() {PANNING = !PANNING; PAINT_COL = Math.max(0, PAINT_COL); /*PAINT_COL = PAINT_COL < 0 ? 1 : -1;*/}, [10, 10], {x: 50, y: 50}, 2, 0);
var GRID_BUT = new Button(["grid_on", "grid_off"], ["hide gridlines", "show gridlines"], function() { drw.lines = !drw.lines; drw.raw = true; }, [10, 10], {x: 50, y: 50}, 2, 0);
var FILL_BUT = new Button(["scatter_plot"], ["random life"], function() { TRASH_BUT.do_click(); drw.randFill(); }, [10, 10], {x: 50, y: 50}, 1, 0);
var ABOUT_BUT = new Button(["info", "info"], ["about life", "to life"], function() { resize_menu(); if ($('#about').css('z-index') < 0) $('#about').css('z-index', 1000); else $('#about').css('z-index', -1); }, [10, 10], {x: 50, y: 50}, 1, 0);
var HISTORY_BUT = new Button(["blur_on", "blur_off"], ["disable history", "enable history"], function() { if (gr.rule.his == 0) gr.rule.his = HIS; else gr.rule.his = 0; drw.raw = true; }, [10, 10], {x: 50, y: 50}, 2, 0);
var PAUSE_BUT = new Button(["pause", "play_arrow"], ["stop life", "start life"], function() { drw.pause = !drw.pause; }, [10, 10], {x: 50, y: 50}, 2, 1);
var SKIP_BUT = new Button(["fast_forward"], ["skip life"], function() { for (var i = 0; i < SKIP_GEN; i++) gr.nextGen(); drw.raw = true; }, [10, 10], {x: 50, y: 50}, 1, 0);
var NEXT_BUT = new Button(["skip_next"], ["next life"], function() { if (!drw.pause) PAUSE_BUT.do_click(); gr.nextGen(); }, [10, 10], {x: 50, y: 50}, 1, 0);
var TRASH_BUT = new Button(["delete_forever"], ["kill life"], function() { gr.cells = new Map(); gr.oldcells = new Map(); drw.raw = true; if (!drw.pause) PAUSE_BUT.do_click(); gr.gen = 0; }, [10, 10], {x: 50, y: 50}, 1, 0);
var CELL_SHAPE_BUT = new Button(["fiber_manual_record", "stop"], ["full life", "round life"], function() { drw.circle = !drw.circle; drw.raw = true; }, [10, 10], {x: 50, y: 50}, 2, 1);
var LIFE_RULES = new Button(["filter_1", "filter_2", "filter_3"], ["wireworld", "hex life", "conway's life"], function() { toggleRules(); PAINT_COL = Math.min(PAINT_COL, gr.rule.ncol - 1); }, [10, 10], {x: 50, y: 50}, 3, 0);
var STAT_BUT = new Button(["label_off", "label"], ["show life stats", "hide life stats"], function() { SHOW_STATS = !SHOW_STATS; drw.raw = true; }, [10, 10], {x: 50, y: 50}, 2, 1);
var COLOR_PICK_BUT = new Button(["palette"], ["life type"], function() { pick_col(); }, [10, 10], {x: 50, y: 50}, 1, 0);
var ARCHIVE_BUT = new Button(["archive"], ["life samples"], function() { window.location.href = "blife/life.zip"; }, [10, 10], {x: 50, y: 50}, 1, 0);
var TOP_BUTTON = [FOPEN_BUT, FPASTE_BUT, FSAVE_BUT, COLOR_PICK_BUT, BRUSH_BUT, GRID_BUT, HISTORY_BUT, STAT_BUT, CELL_SHAPE_BUT, FILL_BUT, TRASH_BUT, ABOUT_BUT];
var O_BUTTON = [PAUSE_BUT, NEXT_BUT, SKIP_BUT];

/*** SLIDER ***/
class Slider {
	constructor(rendchar, hover, upact, dwnact, chact, pos, dim, step, mnval, mxval, val) {
		this.rendchar = rendchar;
		this.dwnact = dwnact;
		this.mnval = mnval;
		this.mxval = mxval;
		this.hover = hover;
		this.upact = upact;
		this.chact = chact;
		this.step = step;
		this.msd = false;
		this.msp = false;
		this.pval = val;
		this.pos = pos;
		this.dim = dim;
		this.val = val;
	}
	pad() { return this.dim.y + SLIDE_EXTRA_PAD * this.dim.x; }
	rend() {
		this.val = this.chact();
		ctx.lineWidth = BUTTON_OUTLINE;
		var col = isDark(drw.cols[0]) ? MENU_BUT : DARK_MENU_BUT;
		var pad = this.pad();
		ctx.fillStyle = col;
		ctx.fillRect(this.pos[0] + pad, Math.floor(this.pos[1] + this.dim.y / 2 - SLIDE_HEIGHT / 2) + 0.5, this.dim.x - 2 * pad, SLIDE_HEIGHT);
		ctx.textAlign = "center";
		ctx.font = (this.pad() - SLIDE_EXTRA_PAD * this.dim.x) + "px Material Icons";
		ctx.fillText(this.rendchar[0], this.pos[0] + pad / 2, this.pos[1] + this.dim.y);
		ctx.fillText(this.rendchar[1], this.pos[0] + this.dim.x - pad / 2, this.pos[1] + this.dim.y);
		ctx.fillStyle = isDark(drw.cols[0]) ? MENU_BUT_MSD : DARK_MENU_BUT_MSD;
		if (this.msd) {
			ctx.font = Math.floor(BUTTON_LABEL_PROP * (MENU_PROP * canvas.height - this.dim.y)) + "px " + HOVER_FONT;
			ctx.fillText(this.hover, this.pos[0] + this.dim.x / 2, Math.ceil((1 - MENU_PROP) * canvas.height + (1 - BUTTON_LABEL_PROP) * (MENU_PROP * canvas.height - this.dim.y)) + 1);
		}
		var prop = (this.val - this.mnval) / (this.mxval - this.mnval);
		ctx.fillRect(this.pos[0] + pad, Math.floor(this.pos[1] + this.dim.y / 2 - SLIDE_HEIGHT / 2) + 0.5, Math.floor(prop * (this.dim.x - 2 * pad)) + 0.5, SLIDE_HEIGHT);
		flCir([this.pos[0] + pad + prop * (this.dim.x - 2 * pad), Math.floor(this.pos[1] + this.dim.y / 2)], SLIDE_BALL * 0.5 * this.dim.y);
	}
	in_this(ev) { return ev.x >= this.pos[0] && ev.y >= this.pos[1] && ev.x <= this.pos[0] + this.dim.x && ev.y <= this.pos[1] + this.dim.y; }
	up_step() { if (this.val < this.mxval) this.val = Math.min(this.upact(), this.mxval); }
	dwn_step() { if (this.val > this.mnval) this.val = Math.max(this.dwnact(), this.mnval); }
	set_val(nval) {
		nval = Math.min(Math.max(nval, this.mnval), this.mxval);
		if (this.val < nval)
			while (this.val < nval)
				this.val = this.upact();
		else if (this.val > nval)
			while (this.val > nval)
				this.val = this.dwnact();
		this.val = nval;
	}
	press_check(ev) { this.msp = this.in_this(ev) && this.pos[0] + this.pad() <= ev.x && this.pos[0] + this.dim.x - this.pad() >= ev.x, this.pval = this.val; }
	move_check(ev) {
		this.msd = this.in_this(ev) || this.msp;
		if (this.msp)
			this.set_val(Math.round(this.mnval + (ev.x - this.pos[0] - this.pad()) * (this.mxval - this.mnval) / (this.dim.x - 2 * this.pad())));
	}
	click_check(ev) {
		if (!this.msp) {
			if (this.in_this(ev))
				if (this.pos[0] + this.pad() >= ev.x)
					this.dwn_step();
				else if (this.pos[0] + this.dim.x - this.pad() <= ev.x)
					this.up_step();
		}
		else if (this.pval == this.val)
			if (this.mnval + (ev.x - this.pos[0] - this.pad()) * (this.mxval - this.mnval) / (this.dim.x - 2 * this.pad()) > this.val)
				this.up_step();
			else
				this.dwn_step();
		this.msp = false;
	}
}
// Sliders
var ZOOM_S = new Slider(["zoom_out", "zoom_in"], "life size", function() { return drw.zoom(1); }, function() { return drw.zoom(-1); }, function() { var i; for (i = 0; i < ZOOM_ARR.length; i++) if (ZOOM_ARR[i] >= drw.celldim.x) return i; return i; }, [200, 200], {x: 500, y: 50}, 10, 0, 100, 100);
var SPEED_S = new Slider(["timer", "shutter_speed"], "speed of life", function() { var i; for (i = 0; i < PAUSE_ARR.length; i++) if (PAUSE_ARR[i] <= PAUSE) break; i = Math.max(Math.min(i + 1, PAUSE_ARR.length - 1), 0); PAUSE = PAUSE_ARR[i]; return i; }, function() { var i; for (i = 0; i < PAUSE_ARR.length; i++) if (PAUSE_ARR[i] <= PAUSE) break; i = Math.max(Math.min(i - 1, PAUSE_ARR.length - 1), 0); PAUSE = PAUSE_ARR[i]; return i; }, function() { var i; for (i = 0; i < PAUSE_ARR.length; i++) if (PAUSE_ARR[i] <= PAUSE) return i; }, [200, 200], {x: 500, y: 50}, 10, 0, PAUSE_ARR.length - 1, PAUSE_ARR.length - 1);
var O_SLIDER = [ZOOM_S, SPEED_S];

/*** INTERFACE ***/

// File export
var exportf = function () {
    var a = document.createElement('a');
    a.href = "data:application/octet-stream,"+encodeURIComponent(drw.to_string());
    a.download = "save_state.caf";
    a.click();
};

// File import
var init = function (sin, paste) {
    var tw = sin.split(/\s/);
    var words = [];
    tw.forEach(function(w) {
        if (w != "")
            words.push(w);
    });
    var stream = {s: words, i: 0};
    var rl = new Rules(nextInt(stream), null, nextInt(stream) == 1, nextInt(stream) == 1, 0, "");
	if (gr != null) rl.his = gr.rule.his;
    if (nextInt(stream) == 1) {
        gr = new SquareGrid(new Map(), rl, 0);
        drw = new SquareGridDrawer(gr, drw.dim, 0, 0, [], drw.glcol, false, drw.grad, drw.lines);
    }
    else {
        gr = new HexGrid(new Map(), rl, 0);
        drw = new HexGridDrawer(gr, drw.dim, 0, 0, [], drw.glcol, false, drw.grad, drw.lines);
    }
    rl.step = new Node(rl.ncol);
    rl.step.ch.map(function(e) { return new Node(rl.ordered ? rl.ncol : (gr.nneigh() + 1)); });
    rl.nr = nextInt(stream);
    var nw = rl.ordered ? (gr.nneigh() + 2) : (rl.ncol + 1);
    for (var i = 0; i < rl.nr; i++) {
        var r = [];
        for (var j = 1; j < nw; j++)
            r.push(nextInt(stream));
        rl.step.insert(r, nextInt(stream), i);
    }
    var x = nextInt(stream), y = nextInt(stream);
    drw.pos = [nextInt(stream), nextInt(stream)];
    for (var i = 0; i < y; i++)
        for (var j = 0; j < x; j++)
            gr.set(drw.pos[0] + j, drw.pos[1] + i, nextInt(stream));
    for (var i = 0; i < rl.ncol; i++)
        drw.cols.push(next(stream));
    var arr = [parseFloat(next(stream)), parseFloat(next(stream))];
    if (!paste)
        drw.pos = arr;
    drw.celldim = {x: nextInt(stream), y: nextInt(stream)};
    drw.raw = true;
	while (stream.i < stream.s.length)
		gr.rule.name += next(stream) + (stream.i == stream.s.length ? "" : " ");
}
var readfile = function(fin, paste) {
	var ogr = gr;
	var odrw = drw;
	init(fin, paste);
	if (paste) {
		gr.fix();
		odrw.aux = gr;
		odrw.aps = [0, 0]//drw.pos;
		drw = odrw;
		gr = ogr;
		PASTING = true;
	}
	else
		drw.recenter();
	PAINT_COL = Math.min(PAINT_COL, gr.rule.ncol - 1);
}
var importf = function(paste) {
    if (!drw.pause)
		PAUSE_BUT.do_click();
    var input = document.createElement('input');
    input.type = "file";
    input.accept = ".caf";
    input.onchange = e => {
		var file = e.target.files[0];
		var fin = new FileReader();
		fin.readAsText(file, "UTF-8");
		fin.onload = readerEvent => { readfile(readerEvent.target.result, paste); }
	}
    input.click();
	setTimeout(function() {}, IMPORT_PAUSE);
}
var menuaction = function(event, ui) {
	if ($("#menu").menu("option", "disabled"))
		return;
	ui = ui != CANCEL_ID ? $(ui.item).find('div').attr('id') : ui;
	if (ui == DIR_ID)
		return;
	//$('#menu').menu("collapseAll", null, true);
	$('#menu').css('z-index', -100);
	$('#menu').menu("option", "disabled", true);
	drw.raw = true;
	if (ui == CANCEL_ID)
		return;
	if (!MENU_PASTE && ui != CUSTOM_ID)
		TRASH_BUT.do_click();
	setTimeout(function() {/* alert(ui); */}, 100);
	if (ui == CUSTOM_ID)
		importf(MENU_PASTE);
	else {
		var request = new XMLHttpRequest();
		request.open('GET', FILE_PREFIX + ui, true);
		request.send(null);
		request.onreadystatechange = function () {
			if (request.readyState === 4 && request.status === 200) {
				var type = request.getResponseHeader('Content-Type');
				if (type.indexOf("text") !== 1) {
					readfile(request.responseText, MENU_PASTE);
				}
			}
		}
	}
}
var importmenu = function(paste) {
	//if (MENU_PASTE == paste && parseInt($('#menu').css('z-index')) > 0)
		//menuaction(null, CANCEL_ID);
	MENU_PASTE = paste;
	resize_menu();
	$('#menu').menu("option", "disabled", false);
	$('#menu').css('z-index', 1);
}

// Keypress
var keyed = function(event) {
	if (event.keyCode == 27) {
		$("#about").css("z-index", -1);
		menuaction(null, CANCEL_ID);
		PICKER.vis = false;
        PASTING = false;
        drw.aux = null;
		drw.raw = true;
		MP = 0;
    }
	if ($('#about').css("z-index") > 0)
		return;
    for (var i = 0; i <= 9; i++)
        if (event.key == i.toString())
            PAINT_COL = Math.min(gr.rule.ncol - 1, i);
    if (event.key == 'p' || event.key == ' ')
        PAUSE_BUT.do_click();
	if (event.key == 'l')
		SKIP_BUT.do_click();
    if (event.key == '=')
        drw.zoom(1);
    if (event.key == '-')
        drw.zoom(-1);
	if ((event.key == 'W' || (event.keyCode == 38 && event.shiftKey)) && PASTING)
		drw.aux.trans(function(p) { return [p[0], -p[1]]; });
    else if (event.key == 'w' || event.key == 'W' || event.keyCode == 38)
        drw.move(UP, false);
    if ((event.key == 'A' || (event.keyCode == 37 && event.shiftKey)) && PASTING)
		drw.aux.trans(function(p) { return [p[1], -p[0]]; });
    else if (event.key == 'a' || event.key == 'A' || event.keyCode == 37)
        drw.move(LEFT, false);
	if ((event.key == 'S' || (event.keyCode == 40 && event.shiftKey)) && PASTING)
		drw.aux.trans(function(p) { return [-p[0], p[1]]; });
    else if (event.key == 's' || event.key == 'S' || event.keyCode == 40)
        drw.move(DOWN, false);
    if ((event.key == 'D' || (event.keyCode == 39 && event.shiftKey)) && PASTING)
		drw.aux.trans(function(p) { return [-p[1], p[0]]; });
    else if (event.key == 'd' || event.key == 'D' || event.keyCode == 39)
        drw.move(RIGHT, false);
	if (event.key == '.')
		SPEED_S.up_step()
	if (event.key == ',')
		SPEED_S.dwn_step()
	if (event.key == 'i')
		ABOUT_BUT.do_click();
    if (event.key == 'o')
        FOPEN_BUT.do_click();
    if (event.key == 'v')
        FPASTE_BUT.do_click();
    if (event.key == 'x')
        exportf();
    if (event.key == 'f')
        drw.randFill();
    if (event.key == 't')
        BRUSH_BUT.do_click();
    if (event.key == 'h')
        HISTORY_BUT.do_click();
    if (event.key == 'n')
        NEXT_BUT.do_click();
	if (event.key == 'q')
		STAT_BUT.do_click();
    if (event.keyCode == 8 || event.key == "Delete")
        TRASH_BUT.do_click();
    if (event.key == 'c')
        CELL_SHAPE_BUT.do_click();
    if (event.key == 'g')
        GRID_BUT.do_click();
    if (event.key == 'r')
        LIFE_RULES.do_click();
	drw.drw = true;
}

// Mouseclick
var clicked = function(event) {
	console.log("clicked");
	var pic = PICKER.vis;
	var dis = $("#menu").menu("option", "disabled");
	var ab = $("#about").css("z-index") > 0;
	TOP_BUTTON.forEach(function(e) { e.click_check(event); });
	O_BUTTON.forEach(function(e) { e.click_check(event); });
	O_SLIDER.forEach(function(e) { e.click_check(event); });
	PICKER.click_check(event);
	if (pic) {
		pic = PICKER.vis = false, drw.raw = true;
		MP = 0;
		return;
	}
	if (!dis) {
		menuaction(null, CANCEL_ID);
		MP = 0;
		moved(event);
		if (inBounds(event.x, event.y))
			return;
	}
	if (ab && event.y < MENU_PROP * canvas.height)
		$("#about").css("z-index", -1);
    if (inBounds(event.x, event.y))
        if (PASTING) {
            drw.paste();
        }
        else if (!MOVED && mpc.pos[0] == Math.floor(drw.cellAt(nmx, nmy)[0]) && mpc.pos[1] == Math.floor(drw.cellAt(nmx, nmy)[1])) {
				var p = drw.cellAt(event.clientX, event.clientY);
				if (PAINT_COL < 1)
					gr.set(Math.floor(p[0]), Math.floor(p[1]), PANNING ? (Math.max(0, gr.stateAt(p[0], p[1])) + 1) % gr.rule.ncol : gr.stateAt(p[0], p[1]) <= 0 ? 1 : 0, true);
				else
					gr.set(Math.floor(p[0]), Math.floor(p[1]), gr.stateAt(p[0], p[1]) == PAINT_COL ? 0 : PAINT_COL, true);
			}
		else if (!PANNING) {
			var p = drw.cellAt(event.clientX, event.clientY);
			gr.set(Math.floor(p[0]), Math.floor(p[1]), Math.max(0, PAINT_COL));
		}
	MP = 0;
	drw.drw = true;
	moved(event);
}

// Mousepress
var pressed = function(event) {
	//alert(event.x + " " + event.y);
	if (PICKER.vis)
		return;
	console.log("pressed");
	O_SLIDER.forEach(function(e) { e.press_check(event); });
	if (inBounds(event.x, event.y)) {
		MOVED = false;
		MP = event.shiftKey ? 2 : 1;
		mpc = drw.grid.get(Math.floor(drw.cellAt(event.x, event.y)[0]), Math.floor(drw.cellAt(event.x, event.y)[1]));
	}
	drw.drw = true;
	moved(event);
}
var released = function(event, tch) {
	console.log("released " + tch)
    if (MP == 2 && !PANNING && inBounds(event.x, event.y)) {
        drw.paste();
        drw.aux = null;
    }
	if (tch)
		clicked(event);
}

// Mousewheel
var wheeled = function(event) {
    if (event.deltaY != 0 && inBounds(event.x, event.y))
        drw.zoom(-Math.sign(event.deltaY));
}

// Mouse move
var moved = function(event) {
	console.log("moved " + MP);
	TOP_BUTTON.forEach(function(e) { e.move_check(event); });
	O_BUTTON.forEach(function(e) { e.move_check(event); });
	O_SLIDER.forEach(function(e) { e.move_check(event); });
    nmx = event.x;
    nmy = event.y;
	if (inBounds(event.x, event.y)) {
		if (MP > 0 && !PANNING && !PASTING && lmx >= 0) {
			if (MP == 1) {
				gr.line(gr.get(Math.floor(drw.cellAt(lmx, lmy)[0]), Math.floor(drw.cellAt(lmx, lmy)[1])), gr.get(Math.floor(drw.cellAt(nmx, nmy)[0]), Math.floor(drw.cellAt(nmx, nmy)[1]))).forEach(function(c) {
					gr.set(c.pos[0], c.pos[1], Math.min(PAINT_COL, drw.grid.rule.ncol - 1));
				});
				drw.grid.set(Math.floor(drw.cellAt(nmx, nmy)[0]), Math.floor(drw.cellAt(nmx, nmy)[1]), Math.min(PAINT_COL, drw.grid.rule.ncol - 1));
			}
			else {
				drw.aux = new SquareGrid(new Map());
				gr.line(mpc, gr.get(Math.floor(drw.cellAt(nmx, nmy)[0]), Math.floor(drw.cellAt(nmx, nmy)[1]))).forEach(function(c) {
					drw.aux.set(c.pos[0], c.pos[1], Math.min(PAINT_COL, drw.grid.rule.ncol - 1));
				});
				drw.aux.set(mpc.pos[0], mpc.pos[1], Math.min(PAINT_COL, drw.grid.rule.ncol - 1))
				drw.aux.set(Math.floor(drw.cellAt(nmx, nmy)[0]), Math.floor(drw.cellAt(nmx, nmy)[1]), Math.min(PAINT_COL, drw.grid.rule.ncol - 1))
			}
			drw.drw = true;
		}
		if (PANNING && MP > 0) {
			var nc = drw.grid.get(Math.floor(drw.cellAt(event.x, event.y)[0]), Math.floor(drw.cellAt(event.x, event.y)[1]));
			var vec = [mpc.pos[0] - nc.pos[0], mpc.pos[1] - nc.pos[1]];
			if (vec[0] != 0 || vec[1] != 0) {
				drw.move([vec, vec], true);
				drw.drw = true;
				MOVED = true;
			}
		}
	}
	if (PASTING)
		drw.drw = true;
    lmx = MP > 0 ? nmx : -1;
    lmy = MP > 0 ? nmy : -1;
}

/*** MENU ***/
var draw_menu = function() {
	ctx.fillStyle = drw.cols[0];
	ctx.strokeStyle = isDark(drw.cols[0]) ? MENU_BORDERS : DARK_MENU_BORDERS;
	ctx.lineWidth = 1;
	ctx.fillRect(0, 0, canvas.width, MENU_PROP * canvas.height);
	ctx.fillRect(0, (1 - MENU_PROP) * canvas.height, canvas.width, MENU_PROP * canvas.height);
	ctx.strokeRect(0.5, 0.5, canvas.width - 1, Math.floor(MENU_PROP * canvas.height));
	ctx.strokeRect(0.5, canvas.height - Math.floor(MENU_PROP * canvas.height) + 0.5, canvas.width - 1, Math.floor(MENU_PROP * canvas.height) - 1);
	TOP_BUTTON.forEach(function(e) { e.rend(); });
	O_BUTTON.forEach(function(e) { e.rend(); });
	O_SLIDER.forEach(function(e) { e.rend(); });
	PICKER.rend();
}

/*** UTILITIES ***/

// Grid bounds
var inBounds = function(x, y) { return y > MENU_PROP * canvas.height && y < (1 - MENU_PROP) * canvas.height; }

// Sleep
const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// Stream
var next = function(s) {
    s.i++;
    return s.s[s.i - 1];
}
var nextInt = function(s) {
    return parseInt(next(s), 10);
}

// Color brightness
var isDark = function(s) {
	return "01234".includes(s[2]) || "01234".includes(s[4]) || "01234".includes(s[6]);
}

// Make a trie a space separated number string
var stringify = function(t, pre, l) {
    if (t.line != -1)
        l[t.line] = pre + t.val + "\n";
    for (var i = 0; i < t.ch.length; i++)
        if (t.ch[i] != null)
            stringify(t.ch[i], pre + (i - 1) + " ", l);
    return l;
}

// Zip coordinates
var zip = function(x, y) {
    var z = 0, d = 10;
    if (x < 0) {
        z += 2;
        x = -x;
    }
    if (y < 0) {
        z += 1;
        y = -y;
    }
    while (x != 0 || y != 0) {
        z += d * 10 * (x % 10) + d * (y % 10);
        d *= 100;
        x = Math.floor(x / 10);
        y = Math.floor(y / 10);
    }
    return z;
}

// Unzip coordinate
var unzip = function(z) {
    var x = 0, y = 0, d = 1, s = z % 10;
    z = Math.floor(z / 10);
    while (z != 0) {
        x += d * Math.floor((z % 100) / 10);
        y += d * (z % 10);
        z = Math.floor(z / 100);
        d *= 10;
    }
    if (s % 2 != 0)
        y = -y;
    if (s > 1)
        x = -x;
    return [x, y];
}

/*** MAKE RULES ***/
var makeRules = function() {
    init(LIFESTR, false);
    LIFE = gr.rule;
    init(WIREWORLDSTR, false);
    WIREWORLD = gr.rule;
    init(HEXSTR, false);
    HEXLIFE = gr.rule;
    init(LIFESTR, false);
    LIFE.his = 0;
    WIREWORLD.his = 0;
    HEXLIFE.his = 0;
}
var toggleRules = function() {
	TRASH_BUT.do_click();
	var ohis = gr.rule.his;
	rule = (rule + 1) % 3;
	if (rule == 0) {
		gr = new SquareGrid(new Map(), LIFE, 0);
		drw = new SquareGridDrawer(gr, {x: canvas.width, y: canvas.height}, drw.celldim, drw.pos, ["#000000", "#00FF00"], GRID_COL, drw.circle, drw.grad, drw.lines);
	}
	else if (rule == 1) {
		gr = new SquareGrid(new Map(), WIREWORLD, 0);
		drw = new SquareGridDrawer(gr, {x: canvas.width, y: canvas.height}, drw.celldim, drw.pos, ["#000000", "#FFC000", "#0000FF", "#FF0000"], GRID_COL, drw.circle, drw.grad, drw.lines);
	}
	else {
		gr = new HexGrid(new Map(), HEXLIFE, 0);
		drw = new HexGridDrawer(gr, {x: canvas.width, y: canvas.height}, drw.celldim, drw.pos, ["#000000", "#00FF00"], GRID_COL, drw.circle, drw.grad, drw.lines);
	}
	drw.raw = true;
	gr.rule.his = ohis;
}

/*** MAINLOOP ***/

var resize_menu = function() {
	$('#menu').position({my: "left top", at: "left+" + (MENU_PASTE ? FPASTE_BUT : FOPEN_BUT).pos[0] + " top+" + Math.ceil(MENU_PROP * canvas.height), of: window});
	$('#menu').css("font-size", "" + Math.floor(IMPORT_MENU_PROP * canvas.height));
	//$('#menu').css("width", "" + Math.floor(IMPORT_MENU_PROP * canvas.height) * IMPORT_MENU_WID);
	//$('#menu').menu("option", "classes.ui-menu-item.width", "1");//$('#menu').css("width"));
	$('#about').css("top", "" + MENU_PROP * canvas.height);
	$('#about').css("left", "0");
	$('#about').css("height", (1 - 2 * MENU_PROP) * canvas.height - 5);
	$('#about').css("width", canvas.width - 5);
	//$('#about').css("font-size", "" + Math.floor(BUTTON_LABEL_PROP * MENU_PROP * canvas.height));
	drw.raw = true;
}
var resize = function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drw.dim.x = canvas.width;
    drw.dim.y = canvas.height;
	ZOOM_ARR = ORIG_ZOOM;
	while (ZOOM_ARR[ZOOM_ARR.length-1] > MAX_PROP * Math.min(canvas.width, canvas.height))
		ZOOM_ARR.pop();
	ZOOM_S.mxval = ZOOM_ARR.length - 1;
    drw.raw = true;
	var tbd = Math.floor(BUTTON_PROP * MENU_PROP * canvas.height - BUTTON_PAD);
	var tbi = (canvas.width - 2 * BUTTON_PAD) / (TOP_BUTTON.length/* + 1*/);
	tbd = Math.min(tbd, tbi - BUTTON_PAD);
	for (var i = 0; i < TOP_BUTTON.length; i++) {
		TOP_BUTTON[i].pos[0] = Math.floor(tbi * (i + 0.5) + BUTTON_PAD - tbd / 2) + 0.5 * (BUTTON_OUTLINE % 2);
		TOP_BUTTON[i].pos[1] = BUTTON_PAD + 0.5 * (BUTTON_OUTLINE % 2);
		TOP_BUTTON[i].dim = { x: tbd, y: tbd };
	}
	PAUSE_BUT.dim = { x: tbd, y: tbd };
	NEXT_BUT.dim = { x: tbd, y: tbd };
	SKIP_BUT.dim = { x: tbd, y: tbd };
	PAUSE_BUT.pos[0] = Math.floor(canvas.width / 2 - tbd / 2) + 0.5 * (BUTTON_OUTLINE % 2);
	PAUSE_BUT.pos[1] = canvas.height - BUTTON_PAD + 0.5 * (BUTTON_OUTLINE % 2) - tbd;
	NEXT_BUT.pos[0] = PAUSE_BUT.pos[0] - tbd - BUTTON_PAD;
	NEXT_BUT.pos[1] = PAUSE_BUT.pos[1];
	SKIP_BUT.pos[0] = PAUSE_BUT.pos[0] + tbd + BUTTON_PAD;
	SKIP_BUT.pos[1] = PAUSE_BUT.pos[1];
	ZOOM_S.pos = [2 * BUTTON_PAD, canvas.height - BUTTON_PAD + 0.5 * (BUTTON_OUTLINE % 2) - tbd];
	ZOOM_S.dim = {x: NEXT_BUT.pos[0] - 2 * BUTTON_PAD - ZOOM_S.pos[0], y: tbd};
	SPEED_S.pos = [SKIP_BUT.pos[0] + SKIP_BUT.dim.x + 2 * BUTTON_PAD, ZOOM_S.pos[1]];
	SPEED_S.dim = {x: ZOOM_S.dim.x, y: ZOOM_S.dim.y };
	if (START)
		resize_menu();
}

async function mainLoop() {
    if (ACT || !SPECIAL_START)
        return;
    ACT = true;
	var firstiter = false;
	if (!START) {
		resize();
		START = true;
		firstiter = true;
		$('#menu').css('z-index', -1);
	}
    if (canvas.width != window.innerWidth || canvas.height != window.innerHeight)
        resize();
	if (firstiter) {
		/*/ Happy New Year!
		keyed({keyCode: -100, key: 'w'});
		keyed({keyCode: -100, key: 'w'});
		keyed({keyCode: -100, key: '='});
		keyed({keyCode: -100, key: '='});
		keyed({keyCode: -100, key: '='});
		keyed({keyCode: -100, key: 'd'});
		keyed({keyCode: -100, key: '-'});
		//var cc = drw.cellAt(canvas.width / 2, canvas.height / 2);
		//gr.set(Math.floor(cc[0]), Math.floor(cc[1]), 1, true);
		keyed({keyCode: -100, key: '.'});
		keyed({keyCode: -100, key: '.'});
		keyed({keyCode: -100, key: '.'});
		keyed({keyCode: -100, key: '.'});
		keyed({keyCode: -100, key: '.'});
		keyed({keyCode: -100, key: '.'});
		keyed({keyCode: -100, key: '.'});
		keyed({keyCode: -100, key: '.'});
		keyed({keyCode: -100, key: '.'});
		STAT_BUT.do_click();
		GRID_BUT.do_click();
		PAUSE_BUT.do_click();
		//*/
	}
    if (!drw.pause && !QUEUED) {
        gr.nextGen();
		QUEUED = true;
		drw.drw = true;
	}
    if (drw.drw || drw.raw)
		drw.draw();
    r = gr.census();
	var cen = "";
	if (SHOW_STATS) {
		for (var i = 2; i <= gr.rule.ncol; i++)
			cen += "State " + (i - 1) + ":\t" + r[i] + (i == gr.rule.ncol ? "" : "\n");
		if (gr.rule.his > 0)
			cen += "\nHistory:\t" + r[0];
	}
	if (gr.rule.name != "")
		cen += (SHOW_STATS ? "\n" : "") + gr.rule.name;
    write(cen, "left", 0, drw.dim.y * (1 - MENU_PROP));
	if (Math.abs(new Date() - tim) + PAUSE_PAD >= PAUSE) {
		sub = Math.abs(new Date() - tim);
		tim = new Date();
		QUEUED = false;
	}
    var gps = (PAUSE == 0 && sub == 0) ? 1000 : 1000 / Math.max(sub, PAUSE);
    if (drw.pause)
        gps = 0;
    cen = (SHOW_STATS ? gr.gen + "  GEN\n" + gps.toFixed(1) + "  GPS\n" : "") + "\u00A9 2020 \u0394V";
    write(cen, "right", drw.dim.x, drw.dim.y * (1 - MENU_PROP));
	draw_menu();
    await sleep(Math.min(PAUSE_PAD, Math.max(0, PAUSE - sub)));
	if (QUEUED && Math.abs(new Date() - tim) >= PAUSE)
		QUEUED = false;
    ACT = false;
}

var life = function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
	ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
	$( "#menu" ).on("menuselect", menuaction);
	//$( "#menu" ).on("click", function(e) { e.preventDefault(); });
	//FILE_PREFIX = 'https:' == document.location.protocol ? "life/" : "";
    DIMC = Math.floor(Math.min(canvas.width, canvas.height) / PROP);
    drw = new SquareGridDrawer(gr, {x: canvas.width, y: canvas.height}, {x: DIMC, y: DIMC}, [0, 0], ["#000000", "#00FF00"], GRID_COL, false, GRAD, true);
    makeRules();
    drw = new SquareGridDrawer(gr, {x: canvas.width, y: canvas.height}, {x: DIMC, y: DIMC}, [0, 0], ["#000000", "#00FF00"], GRID_COL, false, GRAD, true);
	gr.rule.his = HIS;
	HISTORY_BUT.do_click();
	resize();
	drw.recenter();
	//drw.draw(); // SPECIAL
	canvas.addEventListener("mousedown", pressed, false);
	canvas.addEventListener("mouseup", function(e) { released(e, false); }, false);
	canvas.addEventListener("mousemove", moved, false);
	window.addEventListener("keydown", keyed, false);
	//document.onkeydown = keyed;
	canvas.addEventListener("click", clicked, false);
	canvas.addEventListener("wheel", wheeled, false);
	canvas.addEventListener("touchstart", function(e) { e.preventDefault(); pressed(new MouseEvent("", {clientX: e.changedTouches[0].pageX, clientY: e.changedTouches[0].pageY})); }, false);
	canvas.addEventListener("touchend", function(e) { e.preventDefault(); released(new MouseEvent("", {clientX: e.changedTouches[0].pageX, clientY: e.changedTouches[0].pageY}), true); }, false);
	canvas.addEventListener("touchmove", function(e) { e.preventDefault(); moved(new MouseEvent("", {clientX: e.changedTouches[0].pageX, clientY: e.changedTouches[0].pageY})); }, false);
	window.addEventListener("ondblclick", function() {}, false);
	
	/*/ Happy Hanukkah!
	var request = new XMLHttpRequest();
	request.open('GET', FILE_PREFIX + "caf/- Public No Choice/NewYear.caf", true);
	request.send(null);
	request.onreadystatechange = function () {
		if (request.readyState === 4 && request.status === 200) {
			var type = request.getResponseHeader('Content-Type');
			if (type.indexOf("text") !== 1) {
				readfile(request.responseText, false);
				console.log("happy hannukah!");
				SPECIAL_START = true;
			}
		}
	}//*/
	
	/*var fin = new FileReader();
	var file = "caf/- Public No Choice/vulcan.caf"
	fin.readAsText(file, "UTF-8");
	fin.onload = readerEvent => { readfile(readerEvent.target.result, paste); }*/
	
    setInterval(mainLoop, 0);
	
}
