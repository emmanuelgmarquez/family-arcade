// shared room painter for scratch previews
function paintRoom(ctx, wallId, floorId, winId, t) {
  var S = AB.roomStyles, A = AB.art;
  ctx.fillStyle = '#2b3a63'; ctx.fillRect(0, 0, 1280, 900);
  ctx.save(); ctx.beginPath(); ctx.moveTo(120, 470); ctx.ellipse(640, 470, 520, 380, 0, Math.PI, 2 * Math.PI); ctx.lineTo(1160, 470); ctx.closePath(); ctx.clip();
  S.wall[wallId].paint(ctx, { x: 120, y: 90, w: 1040, h: 380 }); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.moveTo(120, 470); ctx.lineTo(1160, 470); ctx.lineTo(1270, 890); ctx.lineTo(10, 890); ctx.closePath(); ctx.clip();
  S.floor[floorId].paint(ctx, { x: 10, y: 470, w: 1260, h: 420 }); ctx.restore();
  ctx.beginPath(); ctx.moveTo(120, 470); ctx.ellipse(640, 470, 520, 380, 0, Math.PI, 2 * Math.PI); ctx.lineTo(1160, 470); ctx.lineWidth = 4; ctx.strokeStyle = '#26324d'; ctx.stroke();
  S.window[winId].draw(ctx, 390, 300, t); S.window[winId].draw(ctx, 890, 300, t);
  A.door(ctx, 580, 900, 120, 100, '#e2574c');
}
function drawItem(ctx, id, x, y, o) {
  var d = AB.furniture[id]; ctx.save(); ctx.translate(x, y);
  if (o.flip && d.flip) ctx.scale(-1, 1);
  d.draw(ctx, o); ctx.restore();
}
