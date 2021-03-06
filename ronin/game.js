//////////////////////////////////////////////////////////
/*
NOTAS: 

http://gaia.fdi.ucm.es/files/people/pedro/slides/dvi/04canvas.html

*/
///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
////////////////////////////////ini///////////////////////////
var game = function(){


	var Q = window.Q = Quintus({ audioSupported: [ 'mp3', 'ogg' ]})
		 .include("Sprites, Scenes, Input, 2D, TMX, Anim, Touch, UI, Audio")
		 // Maximize this game to whatever the size of the browser is
		 .setup({ maximize: true })
		 // And turn on default input controls and touch input (for UI)
		 .controls().touch().enableSound();

	//Q.debug = true;
	Q.debug = false;

	var idEnemy = 0;

		 
	var maxHealth = 100;
	var maxKumoHealth = 30;
	var maxShurikens = 20;
	var currentLevel = 1;

	Q.state.set({
		health: maxHealth,
		shurikens: maxShurikens,
		weapon: "leonard-katana.png",
		kumoMode: "kumoFollow.png",
		kumo_health: maxKumoHealth,
		kumo_cold: 1000,
		enemies: 0,
		state: false
	});
	Q.state.on("change.health, change.kumo_health, change.shurikens, change.weapon, change.kumoMode, change.state, change.kumo_cold", function(){
			Q.stageScene("HUD", 1, 
				{label: "Health " + Q.state.get("health") + "Shurikens "+ Q.state.get("shurikens")});
				});

	Q.load(["katana.png", "katana.json", "cono_grande.png", "cono.png", "hattori.png",
				 "hattori.json", "kumo.json", "shuriken.png", "cursor.png", "cursor.json", "enemy.png", "enemy.json",
				 "shurikenEnemy.png", "health-potion.png", "bag.png", "kumo-jailed.png", "kumo.png", 
				 "calm.png", "alert.png", "leonard-katana.png",
				 "sh.png", "city.jpg", "hatt2.jpg", "valley.jpg", "army-sun.jpg", "swords.jpg",
				 "kumoStop.png", "kumoFollow.png", "bad.json", "bad.png", "boss.png", "boss.json",
				 "hatt3.jpg","hatt.jpg","crying.gif","defeated.jpg"], function(){
		Q.compileSheets("hattori.png", "hattori.json");
		Q.compileSheets("kumo.png", "kumo.json");
		Q.compileSheets("bad.png", "bad.json");
		Q.compileSheets("boss.png", "boss.json");
		Q.compileSheets("enemy.png", "enemy.json");
		Q.compileSheets("katana.png", "katana.json");
	});
	Q.load([ "AncientEvil.mp3", "Persecucion.mp3" , "Cuack.mp3" , "Cuchilla.mp3", "Patito.mp3", "Shuriken.mp3", "Win.mp3", "Lost.mp3", "Wilhelm.mp3", "Duel.mp3"], function() {});

	Q.animations("hattori_anim", {
		//attack: { frames: [1,2,3,4,6,7,8,9,10,11,12,13], rate: 1/30, flip: false, loop:false, next:"stand", trigger: "attackFin"}, 
		stand: { frames: [0], rate: 1/10, flip:false}
	});
	
	Q.animations("kumo_anim", {
		kumo_stand: { frames: [0], loop: true, rate: 1, flip: false},
		kumo_walk: { frames: [1,0,2,0], loop: true, rate: 1/2, flip: false},
		kumo_attack: { frames: [3], loop: true, rate: 1, flip: false}
	});
		
		
	var originX = Q.width/2;
	var originY = Q.height/2;
	var canvas = document.getElementById('quintus');
	var center;
	
	var mousex=0, mousey=0;
	var hattori, kumo;
	var kumoBoolean = false;
	
	
	Q.el.addEventListener('mousemove',function(e) {
		var rect = canvas.getBoundingClientRect();
		
    	mousex = e.offsetX || e.layerX - rect.left,
        mousey = e.offsetY || e.layerY - rect.top;
    });
	
	function getMouse(evt) {
		var rect = canvas.getBoundingClientRect();
		return {
			x: evt.offsetX || evt.layerX,
			y: evt.offsetY || evt.layerY
		};
	};

	document.addEventListener('contextmenu', function(e){
						e.preventDefault(); 
						if(currentLevel != 1) kumo.rush();
					}, false);
	

	var audioState=0;
	var fin=false;

	function audioController(audio){
		if(audio=="AncientEvil" && audioState!=1){
			audioState=1;
			Q.audio.stop("Lost.mp3");
			Q.audio.stop("Win.mp3");
			Q.audio.stop("Persecucion.mp3");
			Q.audio.play(audio+".mp3",{ loop: true });	
		}else if(audio=="Persecucion" && audioState!=2){
			audioState=2;
			Q.audio.stop("Duel.mp3");
			Q.audio.stop("Lost.mp3");
			Q.audio.stop("Win.mp3");
			Q.audio.stop("AncientEvil.mp3");
			Q.audio.play(audio+".mp3",{ loop: true });	
		}else if(audio == "Duel"){
			fin=true
			audioState=3;
			Q.audio.stop();
			Q.audio.play(audio+".mp3",{ loop: true });
		}


	};

	////////////////////////////////////////////////////////////////////
	//////////////////////      HATTORI       //////////////////////////
	////////////////////////////////////////////////////////////////////
	
	Q.Sprite.extend("Hattori", {
		init: function(p){
			this._super(p, {
				sheet: "hattori",
				sprite: "hattori_anim",
				x:500,
				y:500,
				scale:0.5,
				coldownAttack: 50,
				attackType: true,	//false = shuriken, true = sword
				changing: false,
				katana: 0,
				first:true,
				coldRoll:0,
				shurikens:20,
				health: 100,
				enemies: 0
		});
			var kat = this.p.katana;
			
			this.add('2d, animation, platformerControls, tween');
			this.on("attackFin", this, "attackFin");
			this.on("kumoMode", this, "kumoMode"); //Esto va en Kumo
			this.on("changeAttack", this, "changeAttack");
			this.on("clickLeft", this, "fire");
			this.on("roll", this, "roll");
			this.play("stand");
			
			Q.state.set({health: maxHealth, shurikens: maxShurikens});
			Q.state.set("weapon", "leonard-katana.png");
			Q.state.set("state", 0);
		},
		
		kumoMode: function(){
			Q.audio.play("Patito.mp3",{ loop: false });	
			//console.log("kumo mode");
			if(!kumo.p.firstLevel){
				if(!kumo.p.stopped){
					kumo.p.v = 0;
					kumo.p.stopped = true;
					Q.state.set("kumoMode", "kumoStop.png");
				}else{
					kumo.p.vel = 350;
					kumo.p.stopped = false;
					Q.state.set("kumoMode", "kumoFollow.png");
				}
			}
		},
		
		changeAttack: function(){
			if(!this.p.attackType){
				Q.audio.play("Cuchilla.mp3",{ loop: false });	
				this.p.attackType = true;
				Q.state.set("weapon", "leonard-katana.png");
			}
			else{
				Q.audio.play("Shuriken.mp3",{ loop: false });	
				this.p.attackType = false;
				Q.state.set("weapon", "sh.png");
				
			}
		},
		
		roll: function(){
			if(this.p.coldRoll == 0){
				this.p.coldRoll = 50;
				this.animate({speed:800}, 0.2, {callback: function(){this.p.speed=400}});
			}
		},
		
		fire: function(evt){
			var self = this;
			var kat = this.kat.p;
			if(this.p.attackType){ //sword attack
				if(this.p.coldownAttack==0){
					Q.audio.play("Cuchilla.mp3",{ loop: false });
					this.p.coldownAttack=50;
					kat.attacking = true;
					this.kat.animate({angle: kat.angle+60}, 0.1, Q.Easing.Quadratic.In)
					
					.chain({x: (this.p.x - ((this.p.w/4+kat.w*kat.scale/2) * Math.sin(this.p.dir*Math.PI/180)))+(70)*(Math.cos(this.p.dir*Math.PI/180)),
							y: (this.p.y - ((this.p.h/2+kat.w*kat.scale/2) * Math.cos(this.p.dir*Math.PI/180)))-(70)*(Math.sin(this.p.dir*Math.PI/180)), 
							angle: kat.angle+100}, 0.1, Q.Easing.Linear)
					
					.chain({x: (this.p.x - ((this.p.w/4+kat.w*kat.scale/2) * Math.sin(this.p.dir*Math.PI/180)))+(150)*(Math.sin(this.p.dir*Math.PI/180))+(70)*(Math.cos(this.p.dir*Math.PI/180)),
							y: (this.p.y - ((this.p.h/2+kat.w*kat.scale/2) * Math.cos(this.p.dir*Math.PI/180)))-(70)*(Math.sin(this.p.dir*Math.PI/180))+(150)*(Math.cos(this.p.dir*Math.PI/180)), 
							angle: kat.angle+240}, 0.1, Q.Easing.Linear)
					
					.chain({x: (this.p.x - ((this.p.w/4+kat.w*kat.scale/2) * Math.sin(this.p.dir*Math.PI/180))), 
							y: (this.p.y - ((this.p.h/2+kat.w*kat.scale/2) * Math.cos(this.p.dir*Math.PI/180))), 
							angle: kat.angle}, 0.3, Q.Easing.Quadratic.Out, 
							{ callback: function() {kat.attacking = false; kat.finAttack = false;} });
				}
			}else{	//shuriken attack
				if(this.p.coldownAttack==0 && Q.state.get("shurikens")>0){
					this.p.coldownAttack = 50;
					Q.audio.play("Shuriken.mp3",{ loop: false });
					var shuriken = this.stage.insert(new Q.Shuriken({x: this.p.x, y: this.p.y, dir:this.p.dir, shooter: this.className}));
					
					Q.state.inc("shurikens", -1);
				}
			}
		
		},
		
		hurt: function(){
			Q.state.inc("health", -10);
			if(Q.state.get("health") <= 0){
				this.die();
			}
		},
		
		die: function(){
			this.destroy();
			this.kat.destroy();
			Q.audio.stop();
			Q.audio.play("Lost.mp3", { loop: false });
			audioState=0;
			//aparece scene de fin de juego
			Q.clearStages();
			Q.stageScene("died_0", 0);
			Q.stageScene("died_1", 1, { label: "Hattori dies. Try again!"});
		},

     	trigonometry: function (x, y){
			var cos=(x-Q.width / 2)/(Q.width/2);
			var sin=-(y-Q.height / 2)/(Q.height/2);
			
			angle=(Math.atan(sin/cos)/(Math.PI/180));
			if(cos<0)angle+=180;

			return angle;
		},
		
		step: function(dt){
			//console.log("x "+this.p.x);
			//console.log("y "+this.p.y);
			if(this.p.first){
				this.kat = this.stage.insert(new Q.Katana({x: this.p.x, y: this.p.y, dir:this.p.dir}));
				this.p.first=!this.p.first;
			}
			if(this.kat.p.attacking){
				this.kat.p.opacity = 1;
			}else{
				this.kat.p.opacity = 0;
			}
			
			this.p.dir = this.trigonometry(mousex, mousey);
			this.p.angle = -this.p.dir-90;
			originX = this.p.x;
			originY = this.p.y;

			if(this.p.coldRoll){
				this.p.coldRoll--;
			}
	
			if(this.p.coldownAttack){
				this.p.coldownAttack--;
			}
	
			this.kat.p.angle = this.p.angle;
			
			this.kat.p.x = this.p.x - ((this.p.w/4+this.kat.p.w*this.kat.p.scale/2) * Math.sin(this.p.dir*Math.PI/180));
			this.kat.p.y = this.p.y - ((this.p.h/2+this.kat.p.w*this.kat.p.scale/2) * Math.cos(this.p.dir*Math.PI/180));
			////console.log(this.p.enemies);		
		}


	});
	
	
	////////////////////////////////////////////////////////////////////
	///////////////////////      ENEMY       ///////////////////////////
	////////////////////////////////////////////////////////////////////
	
	//------------DEFAULT ENEMY

	Q.Sprite.extend('Enemy', {
		
		init: function(p){
			this._super(p, {
				sheet: "enemy",
				sprite: "enemy anim",
				x: 1000,
				y: 500,
				scale: 0.5,
				dir: 130,
				time: 0,
				patrolTime: 8000,
				patrol: 100,
				v: 0,
				turning:false,
				vel: 300,
				state: 0,
				cono: 0,
				coldownAttack: 100,
				alert: 0,
				health: 30,
				id: "Enemy"+idEnemy,
				first: true
			});
			
			idEnemy++;
			this.add('2d, animation, tween');
			
			this.on("bump.top, bump.bottom", this, "collisiony");
		 	this.on("bump.right, bump.left", this, "collisionx");
		},
	
		collisionx:function(collision){
			if(this.p.state == 0){
				if(collision.obj.isA("Hattori") || collision.obj.isA("Shuriken") || collision.obj.isA("Katana")){
					this.p.state = 1;
					this.p.alert=300;
					this.p.cono.p.asset = "cono_grande.png";
					this.p.cono.size(true);
					Q._generatePoints(this.p.cono,true);
					Q.state.inc("enemies", 1);
					checkState();
				}else{
					var newDir = 180-this.p.dir;
					if(this.p.dir-newDir > 180)
						newDir += 360;
					else if(this.p.dir-newDir < -180)
						newDir -= 360;
					this.turn(newDir,0.5);
				}
			}
		},
		
		collisiony:function(collision){
			if(this.p.state == 0){
				if(collision.obj.isA("Hattori") || collision.obj.isA("Shuriken") || collision.obj.isA("Katana")){
					this.p.alert=300;
					this.p.cono.p.asset = "cono_grande.png";
					this.p.cono.size(true);
					Q._generatePoints(this.p.cono,true);
					this.p.state = 1;
					Q.state.inc("enemies", 1);
					checkState();
				}else{
					var newDir = 360-this.p.dir;
					if(this.p.dir-newDir > 180)
						newDir += 360;
					else if(this.p.dir-newDir < -180)
						newDir -= 360;
					this.turn(newDir,0.5);
				}
			}
		},
		
		turn:function(angle,time){
			if(!this.p.turning){
				var self=this;
				this.p.v=0;
				this.p.turning=true;
				this.animate({dir: angle }, time, Q.Easing.Linear,{
								callback: function() {if(self.p.dir>360)self.p.dir-=360;
										else if(self.p.dir<0)self.p.dir+=360;
										self.p.v = self.p.patrol;this.p.turning=false;} 
				});
				this.p.time=0;
			}
		},
				
		distance: function(){
			var x = this.p.x-hattori.p.x;
			var y = this.p.y-hattori.p.y;
			
			return Math.sqrt(Math.pow(x,2)+Math.pow(y,2));
		},
		
		hurt: function(damage){
			if(this.p.state == 0){
				this.p.cono.p.asset = "cono_grande.png";
				this.p.cono.size(true);
				Q._generatePoints(this.p.cono,true);
				Q.state.inc("enemies", 1);
				checkState();
			}
			this.p.alert=300;
			this.p.state = 1;
			
			this.p.health -= damage;

			if(this.p.health <= 0){
				this.die();
			}
		},
		
		die: function(){
			this.p.cono.destroy();
			this.destroy();
			Q.audio.play("Wilhelm.mp3",{ loop: false });
			if(this.p.state==1){
				Q.state.inc("enemies", -1);
				checkState();
			}

		},
		
		trigonometry: function (x, y){
			var cos = (x-this.p.x)/(Q.width/2);
			var sin = -(y-this.p.y)/(Q.height/2);
			
			var angle = (Math.atan(sin/cos)/(Math.PI/180));
			if(cos<0)
				angle += 180;

			return angle;
		}
		
	});
	
	//------------SHOOTER ENEMY
	
	Q.Enemy.extend("Shooter", {

		init: function(p){
			this._super(p, {});
			
			this.p.health = 30;
			this.p.coldownAttack = 100;
			this.p.vel = 300;
		},
		
		fire: function(){
			if(this.p.coldownAttack <= 0 /*&& this.p.shurikens>0*/){
				this.p.coldownAttack = 100;
				var shuriken = this.stage.insert(new Q.Shuriken({x: this.p.x, y: this.p.y, dir:this.p.dir, shooter: this.p.id, asset: "shurikenEnemy.png"}));
				
			}
		},
		
		step: function(dt){
			if(this.p.first){
				this.p.cono = this.stage.insert(new Q.Cono());
				this.p.first=false;
			}
			
			this.play("stand");
			this.p.angle = -this.p.dir-90;

			if(this.p.state == 1){ //alert mode
				this.p.dir = this.trigonometry(hattori.p.x, hattori.p.y);
				if(this.distance()<500){
					this.p.v=0;
				}
				else{
					this.p.v = this.p.vel;
				}
				
				if(this.p.coldownAttack && this.p.cono.p.alert){		//los tiradores disparan cada cierto tiempo si te ven.
					this.p.coldownAttack --;							//los meeles atacaran si estás en su cono de visión.
				}else{
					this.fire();
				}
				this.p.cono.p.opacity = 0.1;
			}
			else if(!this.p.turning){		//patrol mode
				this.p.cono.p.opacity = 0.5;
				this.p.time += dt*1000;
				this.p.v = this.p.patrol;
				if(this.p.time>=this.p.patrolTime){
					this.turn((this.p.dir+180),1);
				}
				
			}
			
			this.p.vy = -this.p.v*Math.sin(this.p.dir*Math.PI/180);
			this.p.vx = this.p.v*Math.cos(this.p.dir*Math.PI/180);
			
			if(this.p.alert>0){
				this.p.alert--;
			}
			
			if(this.p.cono.p.alert){
				this.p.alert=300;
				if(this.p.state == 0){
					this.p.cono.p.asset = "cono_grande.png";
					this.p.cono.size(true);
					Q._generatePoints(this.p.cono,true);
					Q.state.inc("enemies", 1);
					checkState();
				}
				this.p.state = 1;
			}else if(this.p.alert <= 0){ 
				if(this.p.state == 1){
					this.p.cono.p.asset="cono.png";
					this.p.cono.size(true);
					Q._generatePoints(this.p.cono,true);
					Q.state.inc("enemies", -1);
					checkState();
				}

				this.p.state = 0;
			}

			this.p.cono.p.x = this.p.x + (this.p.h*this.p.scale/2+this.p.cono.p.h*this.p.cono.p.scale/2)*Math.cos(this.p.dir*Math.PI/180);
			this.p.cono.p.y = this.p.y - (this.p.h*this.p.scale/2+this.p.cono.p.h*this.p.cono.p.scale/2)*Math.sin(this.p.dir*Math.PI/180);
			
			this.p.cono.p.dir=this.p.dir;

			//gamestate
		}

	});
	
	//------------MELEE ENEMY
	
	Q.Enemy.extend("Melee", {
		init: function(p){
			this._super(p, {
				katana: 0
			});
			
			this.p.health = 50;
			this.p.coldownAttack = 150;
			this.p.vel = 350;
			
			this.p.katana = new Q.Katana({x: this.p.x, y: this.p.y, dir:this.p.dir, owner: this.p.id});
			var kat = this.p.katana;
		},
		
		die: function(){
			this.p.cono.destroy();
			this.kat.destroy();
			this.destroy();
			Q.audio.play("Wilhelm.mp3",{ loop: false });
			if(this.p.state==1){
				Q.state.inc("enemies", -1);
				checkState();
			}
			if(this.p.id == 'Enemy19' && currentLevel == 2) level2win();
			if(this.p.id == 'Enemy10' && currentLevel == 3) level3win();
		},
		
		fire: function(){
			var self = this;
			var kat = this.kat.p;
			
			if(this.p.coldownAttack<=0){
				this.p.coldownAttack=150;
				kat.attacking = true;
				
				this.kat.animate({angle: kat.angle+60}, 0.1, Q.Easing.Quadratic.In)
				
				.chain({x: (this.p.x - ((this.p.w/4+kat.w*kat.scale/2) * Math.sin(this.p.dir*Math.PI/180)))+(70)*(Math.cos(this.p.dir*Math.PI/180)),
						y: (this.p.y - ((this.p.h/2+kat.w*kat.scale/2) * Math.cos(this.p.dir*Math.PI/180)))-(70)*(Math.sin(this.p.dir*Math.PI/180)), 
						angle: kat.angle+100}, 0.1, Q.Easing.Linear)
				
				.chain({x: (this.p.x - ((this.p.w/4+kat.w*kat.scale/2) * Math.sin(this.p.dir*Math.PI/180)))+(150)*(Math.sin(this.p.dir*Math.PI/180))+(70)*(Math.cos(this.p.dir*Math.PI/180)),
						y: (this.p.y - ((this.p.h/2+kat.w*kat.scale/2) * Math.cos(this.p.dir*Math.PI/180)))-(70)*(Math.sin(this.p.dir*Math.PI/180))+(150)*(Math.cos(this.p.dir*Math.PI/180)), 
						angle: kat.angle+240}, 0.1, Q.Easing.Linear)
				
				.chain({x: (this.p.x - ((this.p.w/4+kat.w*kat.scale/2) * Math.sin(this.p.dir*Math.PI/180))), 
						y: (this.p.y - ((this.p.h/2+kat.w*kat.scale/2) * Math.cos(this.p.dir*Math.PI/180))), 
						angle: kat.angle}, 0.3, Q.Easing.Quadratic.Out, 
						{ callback: function() {kat.attacking = false; kat.finAttack = false;} });
			}
		
		},
		
		step: function(dt){
			//console.log(this.p.alert);
			if(this.p.first){
				this.kat = this.stage.insert(this.p.katana);
				this.p.cono = this.stage.insert(new Q.Cono());
				this.p.first = false;
			}
			if(this.kat.p.attacking){
				this.kat.p.opacity = 1;
			}else{
				this.kat.p.opacity = 1;
			}
			
			this.play("stand");
			this.p.angle = -this.p.dir-90;

			if(this.p.state == 1){ //alert mode
				this.p.dir = this.trigonometry(hattori.p.x, hattori.p.y);
				if(this.distance() < hattori.p.h){
					this.p.v = 0;
					if(this.p.coldownAttack ){
						this.p.coldownAttack --;
					}else{
						this.fire();
					}
				}
				else{
					this.p.v = this.p.vel;
				}

				this.p.cono.p.opacity = 0.1;
			}
			else if(!this.p.turning){		//patrol mode
				this.p.cono.p.opacity = 0.5;
				this.p.time += dt*1000;
				this.p.v = this.p.patrol;
				if(this.p.time>=this.p.patrolTime){
					this.turn((this.p.dir+180),1);
				}	
			}
			if(this.p.coldownAttack){
				this.p.coldownAttack --;
			}
			
			this.p.vy = -this.p.v*Math.sin(this.p.dir*Math.PI/180);
			this.p.vx = this.p.v*Math.cos(this.p.dir*Math.PI/180);
			
			if(this.p.alert>0){
				this.p.alert--;
			}
			
			if(this.p.cono.p.alert){
				//console.log("visto");

				this.p.alert=300;
				if(this.p.state == 0){
					if(this.p.turning){
						this.stop();
						this.p.turning = false;
						//console.log("dont stop me now");
					}
					this.p.cono.p.asset = "cono_grande.png";
					this.p.cono.size(true);
					Q._generatePoints(this.p.cono,true);
					Q.state.inc("enemies", 1);
					checkState();
				}
				this.p.state = 1;
			}else if(this.p.alert <= 0){ 
				if(this.p.state == 1){
					this.p.cono.p.asset="cono.png";
					this.p.cono.size(true);
					Q._generatePoints(this.p.cono,true);
					Q.state.inc("enemies", -1);
					checkState();
				}

				this.p.state = 0;
			}
			this.p.cono.p.x = this.p.x + (this.p.h*this.p.scale/2+this.p.cono.p.h*this.p.cono.p.scale/2)*Math.cos(this.p.dir*Math.PI/180);
			this.p.cono.p.y = this.p.y - (this.p.h*this.p.scale/2+this.p.cono.p.h*this.p.cono.p.scale/2)*Math.sin(this.p.dir*Math.PI/180);
			
			this.p.cono.p.dir=this.p.dir;
			
			this.kat.p.angle = this.p.angle;
			
			this.kat.p.x = this.p.x - ((this.p.w/4+this.kat.p.w*this.kat.p.scale/2) * Math.sin(this.p.dir*Math.PI/180));
			this.kat.p.y = this.p.y - ((this.p.h/2+this.kat.p.w*this.kat.p.scale/2) * Math.cos(this.p.dir*Math.PI/180));

			//gamestate
		}

	});
	
	function checkState(){
		if(Q.state.get("enemies") > 0){
			if(!fin)
				audioController("Persecucion");
			Q.state.set("state", true);
		}else{
			if(!fin)
				audioController("AncientEvil");
			Q.state.set("state", false);
		}
	}
	function level2win(){
		Q.stageScene("level3_intro_0", 0);
		Q.stageScene("level3_intro_1", 1);
		Q.stageScene("level3_intro_2", 2);
	}
	function level3win(){
		Q.stageScene("endGame", 2, {win: false, label: "You kill Gru. You win this game."});
	}

	Q.animations('enemy anim', {
		stand: { frames: [0], rate: 1 }
	});

	////////////////////////////////////////////////////////////////
	///////////////////////////// CONO /////////////////////////////
	////////////////////////////////////////////////////////////////
	
	Q.Sprite.extend("Cono",{
		init:function(p){
			this._super(p, {
				asset:"cono.png",
				x: 500,
				y: 800,
				opacity: 0.5,
				alert: false,
				scale:1
			});
			this.p.sensor=true;
			this.on("hit", this, "hit");
			this.size(true);
			Q._generatePoints(this,true);
		},
		
		hit: function(collision){
			
			if(collision.obj.isA("Hattori") || (collision.obj.isA("Shuriken") && !collision.obj.p.enemy)){
				this.p.alert = true;
				//console.log(collision.obj.className);
			}
		},
		
		
		step:function(dt){
			this.p.angle = -this.p.dir-90;
			this.p.alert = false;
			var dx = (this.p.h*this.p.scale*Math.cos(this.p.dir*Math.PI/180)+this.p.w*this.p.scale*Math.sin(this.p.dir*Math.PI/180))/2;
			var dy = (this.p.w*this.p.scale*Math.cos(this.p.dir*Math.PI/180)+this.p.h*this.p.scale*Math.sin(this.p.dir*Math.PI/180))/2;
			
			if(((hattori.p.x > this.p.x - dx) && (hattori.p.x < this.p.x + dx))||((hattori.p.x < this.p.x - dx) && (hattori.p.x > this.p.x + dx))){
				if(((hattori.p.y > this.p.y - dy) && (hattori.p.y < this.p.y + dy))||((hattori.p.y < this.p.y - dy) && (hattori.p.y > this.p.y + dy))){
					this.p.alert = true;
					//console.log("te veo");
				}
			}
		}
		
	});
	
	
	
	////////////////////////////////////////////////////////////////////
	///////////////////////      KUMO       ////////////////////////////
	////////////////////////////////////////////////////////////////////
	
	Q.Sprite.extend("Kumo", {
		init: function(p) {
			this._super(p, {
				sheet: "kumo_sheet",
				sprite: "kumo_anim",
				scale: 0.3,
				x: 4500,
				y: 500,
				v: 0,
				dir: 0,
				vel: 400,
				firstLevel: true,
				attacking: false,
				lastCollision: "",
				stopped: false,
				end:false
			});
			this.add('2d, animation, tween');

			if(this.p.firstLevel){
				this.on("hit", this, "win");
				this.p.asset = "kumo-jailed.png";
				this.p.scale = 0.2;
			}else{
				this.on("hit", this, "strike");
				
			}
			this.size(true);
		},

		rush: function(){
			Q.audio.play("Cuack.mp3",{ loop: false });	
			var finX = mousex*Q.width/window.innerWidth - Q.width/2 + hattori.p.x;
			var finY = mousey*Q.height/window.innerHeight - Q.height/2 + hattori.p.y;
			
			if(!this.p.firstLevel && (finX != this.p.x) && (finY != this.p.y)){
				this.p.dir = this.trigonometry(finX, finY);
				this.p.attacking = true;
				this.p.lastCollision = "";
				var self = this;	
				this.animate({	
								x: finX, y: finY
							}, (this.distance(finX, finY)/1000), {callback: function(){
													self.p.attacking = false;
							}});
			}
		},
		
		strike: function(collision){
			if(this.p.attacking){
				if(collision.obj.isA("TileLayer") || collision.obj.isA("Hattori")){
					this.stop();
					this.p.attacking = false;
					
				}else if(collision.obj instanceof Q.Enemy){
					if(this.p.lastCollision != collision.obj.p.id){
						collision.obj.hurt(20);
						this.p.lastCollision = collision.obj.p.id
					}
				}
			}

		},
		
		win: function(collision){	
			if(collision.obj.isA("Hattori")){
				this.epic();
				collision.obj.del('platformerControls');
				Q.stageScene("level2_intro_0", 0);
				Q.stageScene("level2_intro_1", 1);
				Q.stageScene("level2_intro_2", 2);
				
			}
		},
		epic: function(){
			if(!this.p.epic){
				Q.audio.stop();
				Q.audio.play("Win.mp3",{ loop: false });
				audioState=0;
				this.p.epic=true;
			}
		},
		hurt: function(damage){
			Q.state.inc("kumo_health", -10);
			if(Q.state.get("kumo_health") <= 0){
				this.die();
			}
		},
				
		distance: function(finX, finY){
			var x = this.p.x - finX;
			var y = this.p.y - finY;
			
			return Math.sqrt(Math.pow(x,2)+Math.pow(y,2));
		},
		
		die: function(){
			this.destroy();
			Q.audio.stop();
			audioState=0;
			Q.audio.play("Lost.mp3",{ loop: false });
			Q.clearStages();
			Q.stageScene("kumo_0", 1);
			Q.stageScene("kumo_1", 2, { label: "Kumo dies. Try again!"});
		},
		
		trigonometry: function (x, y){
			var cos = (x-this.p.x)/(Q.width/2);
			var sin = -(y-this.p.y)/(Q.height/2);
			
			var angle = (Math.atan(sin/cos)/(Math.PI/180));
			if(cos<0)
				angle += 180;

			return angle;
		},
		
		step: function(){
			if(!this.p.firstLevel){
				if(!this.p.attacking)
					this.p.dir = this.trigonometry(hattori.p.x, hattori.p.y);
				
				this.p.angle = -this.p.dir-180;
				if(this.distance(hattori.p.x, hattori.p.y) < hattori.p.h*1.5 && !this.p.attacking){
					this.play("kumo_walk");
					this.p.v = -this.p.vel;
				}
				else if((this.distance(hattori.p.x, hattori.p.y) < hattori.p.h*2 || this.p.stopped) && !this.p.attacking){
					this.play("kumo_stand");
					this.p.v=0;
				}else if(this.p.attacking){
					
					this.play("kumo_attack");
				}else{
					this.play("kumo_walk");
					this.p.v = this.p.vel;
				}
				this.p.vy = -this.p.v*Math.sin(this.p.dir*Math.PI/180);
				this.p.vx = this.p.v*Math.cos(this.p.dir*Math.PI/180);
			}
		}
	  
	});
	
	
	////////////////////////////////////////////////////////////////////
	///////////////////////      WEAPONS       /////////////////////////
	////////////////////////////////////////////////////////////////////
	
	
	//////////////////////////////Shuriken////////////////////////////////
	
	Q.Sprite.extend("Shuriken",{
		init:function(p){
			this._super(p,{
				dir: 0,
				asset:"shuriken.png",
				vy: 0,
				vx: 0,
				sensor: true,
				scale: 0.2,
				shooter: ""
			});
			this.p.vy = -Q.height*Math.sin(this.p.dir*(Math.PI/180));
			this.p.vx = Q.width*Math.cos(this.p.dir*(Math.PI/180));
			this.p.y += -30*Math.sin(this.p.dir*(Math.PI/180));
			this.p.x += 30*Math.cos(this.p.dir*(Math.PI/180));
			
			this.add('2d, animation, tween');
			this.on("hit",this,"hit");
		},
		
		hit: function(collision){
			////console.log(collision.obj.className + "  " + collision.obj.p.x + "  " + collision.obj.p.y);
			if(this.p.shooter == "Hattori"){  //hattori throws it
				if(!collision.obj.isA("Hattori")){
					if(collision.obj instanceof Q.Enemy ){	//si da a enemy
						collision.obj.hurt(10);
					}
					if(!collision.obj.isA("Cono") && !(collision.obj.isA("Katana") && !collision.obj.p.attacking)){
						this.destroy();
					}
				}
			}else{
			
				if((collision.obj instanceof Q.Enemy) && this.p.shooter != collision.obj.p.id){ //si da enemigo que no lo lanzó
					//console.log("es un enemy y no coincide el id. Fuego amigo!");
					collision.obj.hurt(10);

					if(!collision.obj.isA("Cono") && !(collision.obj.isA("Katana") && !collision.obj.p.attacking)){
						this.destroy();
					}
				}/*else if(collision.obj.isA("Enemy") && this.p.shooter == collision.obj.p.id){
					//console.log("se da a sí mismo");
				}*/else{
					if(collision.obj.isA("Hattori") || (collision.obj.isA("Kumo") && !collision.obj.p.attacking)){	//si da a hattori o a Kumo
						collision.obj.hurt(10);
					}
					if(!collision.obj.isA("Cono") && !(collision.obj.isA("Katana") && !collision.obj.p.attacking) 
							&& !((collision.obj instanceof Q.Enemy) && this.p.shooter == collision.obj.p.id)
							&& !(collision.obj.isA("Kumo") && collision.obj.p.attacking)){
						this.destroy();
					}
				}
			}
			
		},
		
		step:function(dt){}
		
	});
	
	
	//////////////////////////// Katana //////////////////////
	
	Q.Sprite.extend("Katana",{
		init:function(p){
			this._super(p,{
				dir: 0,
				asset: "katana.png",
				sensor: true,
				scale: 0.1,
				attacking: false,
				finAttack: false,
				owner: "Hattori"
			});
			this.p.cy = 0;
			this.p.cx = this.p.w/2;
			this.add('tween');
			this.size(true);
			this.on("hit",this,"hit");
		},
		
		hit: function(collision){
			
			if(this.p.attacking && !this.p.finAttack){
				if(this.p.owner == "Hattori"){  //hattori attacks
					if(!collision.obj.isA("Hattori")){
						if(collision.obj instanceof Q.Enemy ){	//si da a enemy
							collision.obj.hurt(15);
							this.p.finAttack = true;
						}
					}
				}else{
					//console.log("ataque de enemigo");
					if(collision.obj.isA("Hattori")){	//si da a hattori
						collision.obj.hurt(15);
						this.p.finAttack = true;
					}
				}
			}
		},
		
		step:function(){}
		
	});
	
	
	////////////////////////////////////////////////////////////////////
	///////////////////////      ITEMS       ///////////////////////////
	////////////////////////////////////////////////////////////////////

	
	//////////////////////////////Potion////////////////////////////////	
	
	Q.Sprite.extend("Potion", {
	  
	  init: function(p) {
		this._super(p, {
			asset: "health-potion.png",
			sensor: true,
			catched: false,
			scale: 0.3,
			x: 1800,
			y: 100
		});
		this.add('2d');
		this.on("hit", this, "up");
	  },
	  up: function(collision){
		if(collision.obj.isA("Hattori") && !this.p.catched){
			this.p.catched = true;
			
			if((Q.state.get("health") + 50) > maxHealth) 
				Q.state.set({health: maxHealth});
			else
				Q.state.inc("health", 50);
			
			this.destroy();
		}
		else if(collision.obj.isA("Kumo") && !collision.obj.p.firstLevel && !this.p.catched){
			this.p.catched = true;
			
			if((Q.state.get("kumo_health") + 10) > maxKumoHealth) 
				Q.state.set({kumo_health: maxKumoHealth});
			else
				Q.state.inc("kumo_health", 10);
			
			this.destroy();
		}
	  },
	  step: function(dt) {
		// Tell the stage to run collisions on this sprite
		}
	  
	});
	
	
	//////////////////////////////Shurikens-Bag////////////////////////////////	
	
	Q.Sprite.extend("Bag", {
	  
	  init: function(p) {
		this._super(p, {
			asset: "bag.png",
			sensor: true,
			catched: false,
			scale: 0.5,
			x: 1800,
			y: 100
		});
		this.add('2d');
		this.on("hit", this, "up");
	  },
	  up: function(collision){
		if(collision.obj.isA("Hattori") && !this.p.catched){
			this.p.catched = true;
			
			if((Q.state.get("shurikens") + 5) > maxShurikens) 
				Q.state.set({shurikens: maxShurikens});
			else
				Q.state.inc("shurikens", 5);
			
			this.destroy();
		}
	  },
	  step: function(dt) {}
	  
	});
	
	
	
	//////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////   STAGES   //////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////////////////////
	
	
	Q.scene("HUD", function(stage) {
		var sh = new Q.UI.Text({x: 100, y: 5, label:  "Health " + Q.state.get("health") + "\n Shurikens "+ Q.state.get("shurikens"), color: "#707070", outlineWidth: 3});
  		var weapon = new Q.Sprite({scale:0.2, x: sh.p.w+sh.p.x, y: 40, asset: Q.state.get("weapon")});
		var kumoMode = new Q.Sprite({scale:0.2, x: weapon.p.x+(weapon.p.w*weapon.p.scale)+20, y: 40, asset: Q.state.get("kumoMode")});
		var box = stage.insert(new Q.UI.Container({x: 0, y: 0}));

		var alert = new Q.Sprite({x: kumoMode.p.x+(kumoMode.p.w*kumoMode.p.scale)+20, y: 40, asset: "alert.png", opacity:0});;
		if(Q.state.get("state")){
			alert.p.opacity = 1;
		}
		
		var aux = ''+Q.state.get("kumo_cold");
		var time = aux.substr(0,2);
		
		if(kumoBoolean){
			sh.p.label = "Health " + Q.state.get("health") + "\n Shurikens "+ Q.state.get("shurikens") + "\n Kumo "+ Q.state.get("kumo_health") + "\n Ready in " + time;
			box.insert(kumoMode);
		}
		box.insert(sh);
		box.insert(weapon);
		
		box.insert(alert);

	});
	
	Q.scene('endGame', function(stage) {
	
		var color;
		if(stage.options.win) color = "rgba(85, 226, 96, 1)"
		else color = "rgba(226, 85, 96, 1)"
		
		var box = stage.insert(new Q.UI.Container({
			x: Q.width/2, y: Q.height/2, fill: "rgba(255,255,255,0.5)", border: "5px", stroke: color, radius: 15
		}));

		var button2 = box.insert(new Q.UI.Button({ x: 0, y: 60, fill: "rgba(100, 100, 100, 1)", border: "2px", stroke: "rgba(51, 50, 50, 1)",
											   shadow: true, shadowColor: "rgba(51, 50, 50, 0.5)", 
											   label: "Play Again" }, 
									 function() {
										Q.clearStages();

										Q.state.set({health: maxHealth, shurikens: maxShurikens});
										Q.state.on("change.health, change.shurikens, change.weapon, change.state", function(){
											Q.stageScene("HUD", 1, 
												{label: "Health " + Q.state.get("health") + "Shurikens "+ Q.state.get("shurikens")});
												});
										if(stage.options.win){
											kumoBoolean = true;
											Q.stageScene('level2', 0);
										}else{
											Q.stageScene('level1', 0);
										}
										Q.stageScene('HUD', 1);
									}));        
		
		var label = box.insert(new Q.UI.Text({cx: button2.width/2, y: -10 - button2.p.h,
											label: stage.options.label }));
											
		box.fit(20);
		
	});

	var iter = 0;
	var introduction = 
		["En el japón feudal, los guerreros más letales \n eran los samurais. Pero sin duda alguna, el mejor \n de todos y el más cruel era Hattori Hanzo.",
			"Cuando su señor lo reclutó siendo un niño, después \n de arrasar su aldea, él no miró atrás.",
			"Cuando su señor lo sometió al más duro entrenamiento, \n recibiendo palizas y torturas, él no se quejó.",
			"Se convirtió en el guerrero más peligroso y sanguinario. \n En la batalla no hacía concesiones a nadie, \n ni a hombres, ni a mujeres, ni a niños.",
			"Su crueldad solo se veía superada \n por su sentido del deber.",
			"Ni siquiera cuando su señor lo alejó del amor de su vida, \n puso objeción alguna a las órdenes que recibía.",
			"Pero todo tiene un límite...",
			"Su señor, intentando demostrar su poder, \n le arrebató a Hattori, \n lo único que de verdad había amado...",
			"Su pato Kumo.",
			"En aquel momento, Hattori decidió exiliarse \n y convertirse en un Ronin en busca de su pato \n y de venganza."];
	var imagesIntro = 
		["city.jpg",
			"city.jpg",
			"city.jpg",
			"army-sun.jpg",
			"army-sun.jpg",
			"swords.jpg",
			"valley.jpg",
			"valley.jpg",
			"kumo-jailed.png",
			"hatt2.jpg"
		];
	
	function scaleToQuintus(w, h, greater){
		var newWidth, newHeight;
		newWidth = Q.width / w;
		newHeight = Q.height / h;
		
		if(greater){
			if(newWidth > newHeight) return newWidth;
			else return newHeight;
		}else{
			if(newWidth < newHeight) return newWidth;
			else return newHeight;
		}
		
	};
	
	
	
	
	Q.scene('intro_0', function(stage) {  //Scene Fondo intro
		var box = stage.insert(new Q.UI.Container({
			cx: Q.height/2, cy: Q.height/2, fill: "rgba(0,0,0,1)"
		}));
		
		
		var fondo = box.insert(new Q.Sprite({x: Q.width/2, y: Q.height/2, asset: imagesIntro[iter]})); 
		if(fondo.p.asset == "kumo-jailed.png")
			fondo.p.scale = scaleToQuintus(fondo.p.w, fondo.p.h, false);
		else
			fondo.p.scale = scaleToQuintus(fondo.p.w, fondo.p.h, true);
		
	});	
	
	Q.scene('intro_1', function(stage) {   //Scene texto intro
		var box = stage.insert(new Q.UI.Container({
			cx: Q.height/2, cy: Q.height/2
		}));
		
		var txt = box.insert(new Q.UI.Text({x: Q.width/2, y: Q.height/4, font: "25pt bold",
									color: "#FFF", outlineWidth: 3, label: introduction[iter]
						})); 
		
		//document.addEventListener("keyup", listener);
		//document.addEventListener("touchend", init);
		
	});		
	Q.scene('intro_2', function(stage) {   //Scene button next intro
		var box = stage.insert(new Q.UI.Container({
			cx: Q.height/2, cy: Q.height/2
		}));
		
		var txt = "Siguiente";
		if(iter == introduction.length-1) txt = "Jugar";	//last
		
		var next = box.insert(new Q.UI.Button({x: 3*Q.width/4, y: 3*Q.height/4, font: "15pt",
									fill: "rgba(100, 100, 100, 0.5)", label: txt, w: Q.width/6
						},  function(){
									if(iter < introduction.length){
										Q.stageScene("intro_0", 0);
										Q.stageScene("intro_1", 1);
										Q.stageScene("intro_2", 2);
									}else{
										init();
									}
								})); 
		var skip = box.insert(new Q.UI.Button({x: 1*Q.width/4, y: 3*Q.height/4, font: "15pt",
									fill: "rgba(100, 100, 100, 0.5)", label: "Omitir", w: Q.width/6
						}, function(){ init(); } )); 
		
		iter++;
		
		//document.addEventListener("keyup", listener);
		//document.addEventListener("touchend", init);
		
	});
	
	Q.scene('level2_intro_0', function(stage) {  //Scene Fondo intro
		var box = stage.insert(new Q.UI.Container({
			cx: Q.height/2, cy: Q.height/2, fill: "rgba(0,0,0,1)"
		}));
		var fondo = box.insert(new Q.Sprite({x: Q.width/2, y: Q.height/2, asset: "hatt3.jpg"})); 
		fondo.p.scale = scaleToQuintus(fondo.p.w, fondo.p.h, true);
	});	
	
	Q.scene('level2_intro_1', function(stage) {   //Scene texto intro
		var box = stage.insert(new Q.UI.Container({
			cx: Q.height/2, cy: Q.height/2
		}));
		var txt = box.insert(new Q.UI.Text({x: Q.width/2, y: Q.height/4, font: "25pt bold",
									color: "#FFF", outlineWidth: 3, label: "Recuperado su fiel compañero de batalla, solo \nle queda vengarse de aquel que osó arrebatarle\n a Kumo, su antiguo señor:\n GRU"
						})); 
	});		
	
	Q.scene('level2_intro_2', function(stage) {   //Scene button next intro
		var box = stage.insert(new Q.UI.Container({
			cx: Q.height/2, cy: Q.height/2
		}));
		
		var txt = "Siguiente";
		
		var next = box.insert(new Q.UI.Button({x: 3*Q.width/4, y: 3*Q.height/4, font: "15pt",
									fill: "rgba(100, 100, 100, 0.5)", label: txt, w: Q.width/6
						},  function(){	
										Q.clearStages();

										Q.state.set({health: maxHealth, shurikens: maxShurikens});
										Q.state.on("change.health, change.shurikens, change.weapon, change.state", function(){
											Q.stageScene("HUD", 1, 
												{label: "Health " + Q.state.get("health") + "Shurikens "+ Q.state.get("shurikens")});
												});
										Q.stageScene('level2', 0);
								}));
	});
	
	
		Q.scene('kumo_0', function(stage) {  //Scene Fondo intro
		var box = stage.insert(new Q.UI.Container({
			cx: Q.height/2, cy: Q.height/2, fill: "rgba(0,0,0,1)"
		}));
		var fondo = box.insert(new Q.Sprite({x: Q.width/2, y: Q.height/2, asset: "crying.gif"})); 
		//fondo.p.scale = scaleToQuintus(fondo.p.w, fondo.p.h, true);
	});	
	
	
	
	Q.scene('kumo_1', function(stage) {   //Scene button next intro
		var box = stage.insert(new Q.UI.Container({
			cx: Q.height/2, cy: Q.height/2
		}));
		
		var txt = "Play Again";
		
		var next = box.insert(new Q.UI.Button({x: Q.width/2, y: 3*Q.height/4, font: "15pt",
									fill: "rgba(100, 100, 100, 0.5)", label: txt, w: Q.width/6
						},  function(){	
										Q.clearStages();

										Q.state.set({health: maxHealth, shurikens: maxShurikens});
										Q.state.on("change.health, change.shurikens, change.weapon, change.state", function(){
											Q.stageScene("HUD", 1, 
												{label: "Health " + Q.state.get("health") + "Shurikens "+ Q.state.get("shurikens")});
												});
										Q.stageScene('level1', 0);
								}));
	});
	Q.scene('died_0', function(stage) {  
		var box = stage.insert(new Q.UI.Container({
			cx: Q.height/2, cy: Q.height/2, fill: "rgba(0,0,0,1)"
		}));
		var fondo = box.insert(new Q.Sprite({x: Q.width/2, y: Q.height/2, asset: "defeated.jpg"})); 
		fondo.p.scale = scaleToQuintus(fondo.p.w, fondo.p.h, true);
	});	
	
	
	
	Q.scene('died_1', function(stage) {   
		var box = stage.insert(new Q.UI.Container({
			cx: Q.height/2, cy: Q.height/2
		}));
		
		var txt = "Play Again";
		
		var next = box.insert(new Q.UI.Button({x: Q.width/2, y: 3*Q.height/4, font: "15pt",
									fill: "rgba(100, 100, 100, 0.5)", label: txt, w: Q.width/6
						},  function(){	
										Q.clearStages();

										Q.state.set({health: maxHealth, shurikens: maxShurikens});
										Q.state.on("change.health, change.shurikens, change.weapon, change.state", function(){
											Q.stageScene("HUD", 1, 
												{label: "Health " + Q.state.get("health") + "Shurikens "+ Q.state.get("shurikens")});
												});
										Q.stageScene('level1', 0);
								}));
	});
	
	
	Q.scene('level3_intro_0', function(stage) {  //Scene Fondo intro
		var box = stage.insert(new Q.UI.Container({
			cx: Q.height/2, cy: Q.height/2, fill: "rgba(0,0,0,1)"
		}));
		var fondo = box.insert(new Q.Sprite({x: Q.width/2, y: Q.height/2, asset: "hatt.jpg"})); 
		fondo.p.scale = scaleToQuintus(fondo.p.w, fondo.p.h, true);
	});	
	
	Q.scene('level3_intro_1', function(stage) {   //Scene texto intro
		var box = stage.insert(new Q.UI.Container({
			cx: Q.height/2, cy: Q.height/2
		}));
		var txt = box.insert(new Q.UI.Text({x: Q.width/2, y: Q.height/4, font: "25pt bold",
									color: "#FFF", outlineWidth: 3, label: "Por fin llega el momento que tanto ansiaba Hattori,\n iba a matar a GRU,\n solo una 'pequeña' guardia lo separa de\n poder teñir de rojo, la armadura azul de su antiguo señor"
						})); 
	});		
	
	Q.scene('level3_intro_2', function(stage) {   //Scene button next intro
		var box = stage.insert(new Q.UI.Container({
			cx: Q.height/2, cy: Q.height/2
		}));
		
		var txt = "Siguiente";
		
		var next = box.insert(new Q.UI.Button({x: 3*Q.width/4, y: 3*Q.height/4, font: "15pt",
									fill: "rgba(100, 100, 100, 0.5)", label: txt, w: Q.width/6
						},  function(){	
										Q.clearStages();

										Q.state.set({health: maxHealth, shurikens: maxShurikens});
										Q.state.on("change.health, change.shurikens, change.weapon, change.state, change.kumo_cold", function(){
											Q.stageScene("HUD", 1, 
												{label: "Health " + Q.state.get("health") + "Shurikens "+ Q.state.get("shurikens")});
												});
										Q.stageScene('level3', 0);
								}));
	});
	
	
	function init(){
		Q.clearStages();
		
		Q.state.set({health: maxHealth, shurikens: maxShurikens});
		Q.state.on("change.health, change.kumo_health, change.shurikens, change.weapon, change.state, change.kumo_cold", function(){
			Q.stageScene("HUD", 1, 
				{label: "Health " + Q.state.get("health") + "Shurikens "+ Q.state.get("shurikens")});
				});
		
		Q.stageScene('level1', 0);
		Q.stageScene('HUD', 1);
	};


	Q.loadTMX("mapa2.tmx, goout.tmx, mapa3.tmx",function() {
		Q.stageScene("intro_0", 0);
		Q.stageScene("intro_1", 1);
		Q.stageScene("intro_2", 2);
	});

	// ## Level1 scene
		// Create a new scene called level 1
	Q.scene('level1', function(stage) {
		idEnemy=0;
		currentLevel = 1;
		Q.stageTMX("mapa2.tmx", stage);
 		audioController("AncientEvil");
		center = stage.add("viewport");
		hattori = stage.insert(new Q.Hattori({x: 500, y: 500}));
		var kumo2 = stage.insert(new Q.Kumo({x: 500, y: 2500, firstLevel: true}));
		var potion = stage.insert(new Q.Potion({x:6816, y:736}));
		var bag = stage.insert(new Q.Bag({x:6716, y:736}));
		
		//var enemy = stage.insert(new Q.Shooter({}));
		var enemy1 = stage.insert(new Q.Melee({dir: 0, vx:0, vy:0}));
		var enemy2 = stage.insert(new Q.Melee({x:700, y:2000, scale: 1, health: 60,dir: 90}));
		enemy2.p.katana.p.scale *= 2;
		var enemy3 = stage.insert(new Q.Shooter({x:2800, y:800}));
		var enemy4 = stage.insert(new Q.Shooter({x:3600, y:700, dir: 0}));
		var enemy5 = stage.insert(new Q.Shooter({x:3600, y:2500}));
		var enemy6 = stage.insert(new Q.Shooter({x:3600, y:1500, dir: 0}));
		var enemy7 = stage.insert(new Q.Shooter({x:5600, y:700}));
		var enemy8 = stage.insert(new Q.Shooter({x:6600, y:700}));
		var enemy9 = stage.insert(new Q.Shooter({x:6400, y:1700}));
		var enemy10 = stage.insert(new Q.Shooter({x:6400, y:2700}));
		
		center.follow(hattori, {x:true, y:true});
	});
    
Q.scene('level2', function(stage) {
		idEnemy=0;
		currentLevel = 2;
		Q.stageTMX("goout.tmx", stage);
 		audioController("AncientEvil");
		center = stage.add("viewport");
		hattori = stage.insert(new Q.Hattori({x: 500, y: 1000}));
		kumo = stage.insert(new Q.Kumo({x: 500, y: 500, firstLevel: false}));
		
		
		// first part
		var potion = stage.insert(new Q.Potion({x:125, y:195}));
		var enemy1 = stage.insert(new Q.Melee({x:1060, y:780, patrol:0, dir: 0, patrolTime:999999}));
		var enemy2 = stage.insert(new Q.Melee({x:350, y:360, patrol:0, dir: 0, patrolTime:999999}));
		//var enemy3 = stage.insert(new Q.Melee({x:515, y:1060, patrol:0, dir: 180, patrolTime:999999}));
		var enemy4 = stage.insert(new Q.Melee({x:470, y:250, patrol:0, dir: 270, patrolTime:999999}));
		var enemy5 = stage.insert(new Q.Melee({x:1300, y:600, patrol:0, dir: 270, patrolTime:999999}));
		var enemy6 = stage.insert(new Q.Melee({x:1750, y:1250, dir: 270, patrolTime:999999}));
		var enemy7 = stage.insert(new Q.Melee({x:3000, y:580, patrol:0, dir: 0, patrolTime:999999}));
		var enemy8 = stage.insert(new Q.Melee({x:3000, y:725, patrol:0, dir: 0, patrolTime:999999}));
		
		//second
		var enemy9 = stage.insert(new Q.Melee({x:2850, y:1440, patrol:0, dir: 0, patrolTime:999999}));
		var enemy10 = stage.insert(new Q.Shooter({x:3500, y:1450, patrol:0, dir: 0, patrolTime:999999}));
		var bag = stage.insert(new Q.Bag({x:2800, y:1450}));
		var potion2 = stage.insert(new Q.Potion({x:2800, y:95}));
		var enemy11 = stage.insert(new Q.Melee({x:3950, y:545, patrol:0, dir: 90, patrolTime:999999}));
		var enemy12 = stage.insert(new Q.Melee({x:3950, y:345, patrol:0, dir: 90, patrolTime:999999}));
		var enemy13 = stage.insert(new Q.Melee({x:3800, y:475, patrol:0, dir: 180, patrolTime:999999}));
		var enemy14 = stage.insert(new Q.Melee({x:4095, y:475, patrol:0, dir: 180, patrolTime:999999}));
		var enemy15 = stage.insert(new Q.Shooter({x:4185, y:215, patrol:0, dir: 0, patrolTime:999999}));
		var enemy16 = stage.insert(new Q.Shooter({x:3950, y:835, patrol:20, dir: 270, patrolTime:2500}));
		//third

		var enemy17 = stage.insert(new Q.Shooter({x:6660, y:740, patrol:0, dir: 180, patrolTime:999999}));
		var enemy18 = stage.insert(new Q.Melee({x:6630, y:145, health:60, patrol:0, dir: 180, patrolTime:999999}));
		var enemy19 = stage.insert(new Q.Melee({x:6215, y:145, health:60, patrol:0, dir: 0, patrolTime:999999}));
		enemy18.p.sheet="boss";
		enemy19.p.sheet="boss";
		var potion3 = stage.insert(new Q.Potion({x:6100, y:145}));

		var enemy20= stage.insert(new Q.Melee({x:6300, y:1265, patrol:30, dir: 90, patrolTime:4000}));
		var fake1 = stage.insert(new Q.Potion({x:6750, y:320}));
		var fake2 = stage.insert(new Q.Potion({x:6825, y:320}));
		
		var enemy21= stage.insert(new Q.Melee({x:7700, y:450, patrol:0, dir: 180, patrolTime:999999, scale:1, health:80}));
		enemy21.p.sheet="boss";

		center.follow(hattori, {x:true, y:true});
	});


Q.scene('level3', function(stage) {
		idEnemy=0;
		currentLevel = 3;
		Q.stageTMX("mapa3.tmx", stage);
 		audioController("Duel");
		center = stage.add("viewport");
		var offset=600;
		hattori = stage.insert(new Q.Hattori({x: 500, y: 800}));
		kumo = stage.insert(new Q.Kumo({x: 500, y: 500, firstLevel: false}));
		//var potion = stage.insert(new Q.Potion({x:6816, y:736}));
		//var bag = stage.insert(new Q.Bag({x:6716, y:736}));
		

		var melee=[];
		var nmelee=5;
		for(var i=0; i<nmelee; i++){
			melee[i] = stage.insert(new Q.Melee({x:800, y:100*i+offset, dir:180, patrol:0, patrolTime:999999}));
		}

		var shooter=[];
		var nshooter=3;
		for(var i=0; i<nshooter; i++){
			shooter[i] = stage.insert(new Q.Shooter({x:1200, y:i*100+offset, dir:180, patrol:0, patrolTime:999999}));
		}

		var titan=[];
		var ntitan=2;
		for(var i=0; i<ntitan; i++){
			titan[i] = stage.insert(new Q.Melee({x:1800, y:i*100+offset, dir:180, patrol:0, scale:1, health:60, patrolTime:999999}));
			titan[i].p.katana.p.scale*=2;
		}


		var gru; //nuestro villano favorito
		gru = stage.insert(new Q.Melee({x:2000, y:500, dir:180, patrol:0, health:200, patrolTime:999999}));
		gru.p.sheet="bad";

		center.follow(hattori, {x:true, y:true});
});


	

}
