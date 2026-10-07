# Synthesised sound bed: warm pad + soft plucks + whooshes on wipes + pops on logo builds.
import numpy as np, wave, sys
SR=48000; DUR=130.0; N=int(SR*DUR); t=np.arange(N)/SR
out=np.zeros((N,2))
def note(m): return 440*2**((m-69)/12)
def lp(x,a):  # one-pole lowpass
    from scipy.signal import lfilter
    return lfilter([a],[1,a-1],x)
# --- pad: Am9 – Fmaj7 – C(add9) – G6, 8 s each
CH=[[57,60,64,67,71],[53,57,60,64,69],[48,55,62,64,67],[55,59,62,64,69]]
pad=np.zeros(N); L=8.0
for k in range(int(DUR/L)+1):
    s0=k*L; seg=(t>=s0-1)&(t<s0+L+1.5)
    tt=t[seg]-s0; env=np.clip((tt+1)/2.2,0,1)*np.clip((L+1.5-tt)/2.5,0,1)
    for m in CH[k%4]:
        f=note(m); 
        for det in (-0.12,0.12):
            pad[seg]+=env*np.sin(2*np.pi*f*2**(det/12)*tt+det*10)*0.05
pad=lp(pad,0.08)
# --- soft plucks (8th notes at 96 bpm) from chord tones, an octave up
beat=60/96/2; pl=np.zeros(N); rng=np.random.default_rng(3)
for i in range(int(DUR/beat)):
    s0=i*beat
    if s0<6.5 or s0>DUR-3: continue
    if rng.random()<0.35: continue
    m=rng.choice(CH[int(s0//L)%4])+12; f=note(m); n=int(SR*0.6); a=int(s0*SR)
    if a+n>N: break
    tt=np.arange(n)/SR; pl[a:a+n]+=np.sin(2*np.pi*f*tt)*np.exp(-tt*9)*0.045*(0.6+0.4*rng.random())
pl=lp(pl,0.3)
# --- whooshes (filtered noise swell) centred on wipes
wh=np.zeros(N)
def whoosh(c,dur=1.1,amp=.32):
    a=int((c-dur*.6)*SR); n=int(dur*SR); tt=np.linspace(0,1,n)
    nz=np.random.default_rng(int(c*10)).standard_normal(n)
    env=np.sin(np.pi*tt)**2.2
    from scipy.signal import butter,sosfilt
    lo=sosfilt(butter(2,[300,2600],btype='band',fs=SR,output='sos'),nz)
    wh[a:a+n]+=lo*env*amp
for c in [25,50,66,82,98,110]: whoosh(c)
for c in [6.95,17.45,35.0,44.5,117.5]: whoosh(c,0.9,.14)
# --- pops / ticks
pp=np.zeros(N)
def pop(c,f=880,amp=.22,dec=28):
    a=int(c*SR); n=int(.35*SR); tt=np.arange(n)/SR
    pp[a:a+n]+=np.sin(2*np.pi*(f*(1+2*np.exp(-tt*60)))*tt)*np.exp(-tt*dec)*amp
# intro sigil + dot, name plus
pop(0.9,520); pop(1.25,990); pop(1.95,1320,.12); pop(20.9,660,.25); pop(21.25,990,.18)
# piste builds (scene start + 1.0 + builder offsets)
for s0,offs in [(50,[(1.0,700),(1.75,880),(2.45,1320)]),(66,[(0.6,520),(0.9,620),(2.45,990),(2.75,1320)]),(82,[(1.0,600),(2.0,880),(2.85,1320)])]:
    for o,f in offs: pop(s0+o,f)
# end cards highlight
for i in range(3): pop(117.5+4.6+i*1.3,880+i*220,.12)
mix=pad+pl+wh+pp
# master: gentle fade in/out + soft clip
mix*=np.clip(t/1.5,0,1)*np.clip((DUR-t)/2.5,0,1)
mix=np.tanh(mix*1.4)/1.4
out[:,0]=mix; out[:,1]=np.roll(mix,int(SR*0.012))*0.96+mix*0.04  # tiny stereo width
pk=np.abs(out).max(); out=out/pk*0.7
w=wave.open(sys.argv[1],'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((out*32767).astype(np.int16).tobytes()); w.close(); print('peak',pk)
