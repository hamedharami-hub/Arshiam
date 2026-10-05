// Sectors in screen space: front, front-right, right, back-right, back, back-left, left, front-left.
export function directionFrame(x,z,angel,previous=null,diagonals=true){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.hypot(x,z)<1e-8)return previous===null?{sector:0,diagonal:false,column:0}:frameForSector(previous,angel,diagonals);
 const angle=Math.atan2(x,z),step=Math.PI/4;
 let sector=(Math.round(angle/step)+8)%8;
 if(previous!==null){const diff=Math.atan2(Math.sin(angle-previous*step),Math.cos(angle-previous*step));if(Math.abs(diff)<step/2+.06)sector=previous;}
 return frameForSector(sector,angel,diagonals);
}
function frameForSector(sector,angel,diagonals){
 if(diagonals&&sector%2===1)return {sector,diagonal:true,column:(sector-1)/2};
 const cardinal=(Math.round(sector/2)*2)%8;
 const column=cardinal===0?0:cardinal===4?2:cardinal===2?(angel?1:3):(angel?3:1);
 return {sector,diagonal:false,column};
}
