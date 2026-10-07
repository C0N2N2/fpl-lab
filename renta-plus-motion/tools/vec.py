import sys, json, numpy as np
from PIL import Image
from scipy import ndimage
import potrace
img_dir, out = sys.argv[1], sys.argv[2]
PAL = {'navy':(20,27,51),'orange':(246,140,40),'red':(254,51,62),'white':(255,255,255),'cream':(254,248,244),'dark':(9,15,38)}
def seg2d(curve):
    d=[f"M{curve.start_point.x:.1f} {curve.start_point.y:.1f}"]
    for s in curve.segments:
        if s.is_corner: d.append(f"L{s.c.x:.1f} {s.c.y:.1f}L{s.end_point.x:.1f} {s.end_point.y:.1f}")
        else: d.append(f"C{s.c1.x:.1f} {s.c1.y:.1f} {s.c2.x:.1f} {s.c2.y:.1f} {s.end_point.x:.1f} {s.end_point.y:.1f}")
    return ''.join(d)+'Z'
res={}
for name,cols in [('1',['navy','orange']),('2',['navy','red']),('4',['navy','orange'])]:
    a=np.asarray(Image.open(f"{img_dir}/{name}.jpg").convert('RGB')).astype(int)
    keys=list(PAL); P=np.array([PAL[k] for k in keys])
    dist=((a[:,:,None,:]-P[None,None])**2).sum(-1); lab=dist.argmin(-1)
    comps=[]
    for c in cols:
        m=np.isin(lab,[keys.index(k) for k in ({'navy':['navy','dark']}.get(c,[c]))])
        m=ndimage.binary_opening(m,iterations=1)
        L,n=ndimage.label(m)
        for i,sl in enumerate(ndimage.find_objects(L),1):
            ys,xs=sl
            y0,x0=max(ys.start-4,0),max(xs.start-4,0)
            cm=(L[y0:ys.stop+4,x0:xs.stop+4]==i)
            area=int(cm.sum())
            if area<400: continue
            # fill holes? no: potrace handles holes via sub-paths
            bm=potrace.Bitmap(~cm)
            pl=bm.trace(turdsize=50,alphamax=1.0,opticurve=True,opttolerance=0.3)
            d=''.join(seg2d(cv) for cv in pl)
            ys,xs=sl
            comps.append(dict(ox=x0,oy=y0,color=c,area=area,x=xs.start,y=ys.start,w=xs.stop-xs.start,h=ys.stop-ys.start,d=d))
    comps.sort(key=lambda k:(k['x']))
    res[name]=comps
    print(name,[ (i,c['color'],c['x'],c['y'],c['w'],c['h']) for i,c in enumerate(comps)])
json.dump(res,open(out,'w'))
