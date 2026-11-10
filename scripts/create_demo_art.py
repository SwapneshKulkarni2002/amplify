from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / 'dist' / 'demo-art'
OUT.mkdir(parents=True, exist_ok=True)
W, H, S = 1200, 800, 2

def mix(a, b, t):
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))

def canvas(top, bottom):
    im = Image.new('RGB', (W * S, H * S))
    px = im.load()
    for y in range(H * S):
        color = mix(top, bottom, y / (H * S - 1))
        for x in range(W * S):
            px[x, y] = color
    return im, ImageDraw.Draw(im)

def p(points):
    return [(int(x * S), int(y * S)) for x, y in points]

def rect(draw, box, fill, radius=0, outline=None, width=1):
    box = tuple(int(v * S) for v in box)
    if radius:
        draw.rounded_rectangle(box, radius=int(radius * S), fill=fill, outline=outline, width=max(1, int(width * S)))
    else:
        draw.rectangle(box, fill=fill, outline=outline, width=max(1, int(width * S)))

def ellipse(draw, box, fill, outline=None, width=1):
    draw.ellipse(tuple(int(v * S) for v in box), fill=fill, outline=outline, width=max(1, int(width * S)))

def poly(draw, points, fill, outline=None):
    draw.polygon(p(points), fill=fill, outline=outline)

def line(draw, points, fill, width=1):
    draw.line(p(points), fill=fill, width=int(width * S), joint='curve')

def tree(draw, x, y, size, leaf='#376C52', trunk='#805F45'):
    rect(draw, (x-size*.07, y-size*.05, x+size*.07, y+size*.66), trunk, 8)
    for dx, dy, r, color in [(-.32,.08,.34,leaf), (0,-.18,.40,leaf), (.33,.06,.34,leaf), (-.1,.18,.38,leaf)]:
        ellipse(draw, (x+(dx-r)*size, y+(dy-r)*size, x+(dx+r)*size, y+(dy+r)*size), color)

def save(im, name):
    im.resize((W, H), Image.Resampling.LANCZOS).save(OUT / name, optimize=True)

def water():
    im, d = canvas((165, 209, 220), (245, 238, 209))
    ellipse(d, (915, 70, 1080, 235), '#F4C982')
    for x, y, r in [(160,155,68),(270,195,48),(810,250,35)]: ellipse(d,(x-r,y-r*.5,x+r,y+r*.5),'#EFF4E8')
    poly(d, [(0,490),(165,370),(315,450),(470,352),(650,465),(815,350),(1010,435),(1200,330),(1200,800),(0,800)], '#91B9A0')
    poly(d, [(0,545),(220,465),(410,512),(635,420),(845,520),(1060,455),(1200,500),(1200,800),(0,800)], '#6A9B7D')
    rect(d,(250,340,980,700),'#F5F1DF',22)
    poly(d,[(220,356),(610,220),(1012,356)],'#D9825D')
    rect(d,(315,397,915,664),'#DDE9D9',12)
    for x in [370,485,600,715,830]:
        rect(d,(x,432,x+55,520),'#79AEB5',9)
        line(d,[(x+27,432),(x+27,520)],'#EAF1E3',5)
    rect(d,(565,550,675,700),'#8B6650',14)
    ellipse(d,(45,536,220,711),'#D9EFBB')
    poly(d,[(133,568),(172,621),(167,671),(133,697),(98,671),(94,621)],'#5BAEC2')
    ellipse(d,(121,601,145,625),'#CFEFF0')
    for x in [75,1075]: tree(d,x,646,110,'#2F6952')
    save(im,'water-school.png')

def transit():
    im,d=canvas((162,205,215),(250,223,169))
    ellipse(d,(940,65,1095,220),'#F6C675')
    poly(d,[(0,458),(150,390),(260,450),(420,325),(560,445),(720,350),(885,440),(1055,325),(1200,390),(1200,800),(0,800)],'#76938B')
    for x,w,h,c in [(25,155,240,'#7B9893'),(180,160,300,'#9FB0A2'),(390,170,230,'#78918D'),(650,165,315,'#78918D'),(870,170,255,'#99A99B'),(1080,150,340,'#728B86')]:
        rect(d,(x,470-h,x+w,470),c)
        for wx in range(x+22,x+w-15,40):
            for wy in range(490-h,455,57): rect(d,(wx,wy,wx+16,wy+23),'#DCC99D',4)
    poly(d,[(0,570),(1200,510),(1200,800),(0,800)],'#485A59')
    line(d,[(0,670),(1200,625)],'#E7D7AD',8)
    for x in range(50,1200,250): rect(d,(x,622,x+105,630),'#F5E7C6',4)
    rect(d,(270,390,935,664),'#1F634F',55)
    rect(d,(320,425,790,540),'#9ECAC4',27)
    for x in range(372,780,115): line(d,[(x,426),(x,539)],'#D4E8DC',8)
    rect(d,(820,430,895,568),'#D8E7D8',25)
    ellipse(d,(360,612,485,740),'#263938'); ellipse(d,(758,612,883,740),'#263938')
    ellipse(d,(394,646,451,703),'#D6DDC9'); ellipse(d,(792,646,849,703),'#D6DDC9')
    line(d,[(220,394),(985,322)],'#E89762',10)
    save(im,'transit.png')

def farm():
    im,d=canvas((180,214,195),(250,222,153))
    ellipse(d,(905,85,1070,250),'#F5C96D')
    poly(d,[(0,450),(180,320),(360,440),(560,290),(760,445),(950,345),(1200,460),(1200,800),(0,800)],'#658B61')
    poly(d,[(0,535),(205,420),(460,535),(710,398),(950,525),(1200,438),(1200,800),(0,800)],'#789A5B')
    poly(d,[(0,630),(260,520),(520,622),(795,495),(1020,615),(1200,550),(1200,800),(0,800)],'#C69A4E')
    for off in range(-350,700,75):
        line(d,[(640+off,800),(640+off*.42,570)],'#E5BE6D',5)
    rect(d,(118,423,372,577),'#ECE9D9',15)
    poly(d,[(92,438),(240,335),(395,438)],'#A85F42')
    rect(d,(213,493,277,578),'#7E604B',9)
    rect(d,(628,484,912,639),'#32644E',28)
    ellipse(d,(585,585,755,755),'#2C493C'); ellipse(d,(820,575,953,708),'#2C493C')
    ellipse(d,(627,627,712,712),'#E5C47C'); ellipse(d,(851,606,920,675),'#E5C47C')
    rect(d,(710,418,850,518),'#47775D',24)
    poly(d,[(714,423),(760,356),(834,356),(857,423)],'#92B6A0')
    line(d,[(0,744),(1200,682)],'#E0BD72',6)
    save(im,'farm.png')

def shelter():
    im,d=canvas((35,58,89),(104,132,153))
    ellipse(d,(900,60,1035,195),'#E5D9B6')
    for x,y,r in [(150,145,4),(245,95,3),(710,110,4),(825,220,3),(1090,250,4)]: ellipse(d,(x-r,y-r,x+r,y+r),'#EEF0D9')
    poly(d,[(0,485),(185,360),(370,485),(555,335),(720,482),(890,360),(1050,478),(1200,390),(1200,800),(0,800)],'#344C65')
    rect(d,(185,345,1012,750),'#D3D5C8',20)
    poly(d,[(150,372),(595,188),(1050,372)],'#815F51')
    rect(d,(258,414,935,740),'#344E63',10)
    for x in [315,465,615,765]:
        rect(d,(x,452,x+92,545),'#E6B768',8)
        line(d,[(x+46,452),(x+46,545)],'#8B6954',5)
    rect(d,(520,563,675,750),'#86674E',12)
    poly(d,[(0,694),(1200,632),(1200,800),(0,800)],'#788F99')
    for x in range(35,1200,155): ellipse(d,(x,732,x+48,780),'#DDE9E7')
    ellipse(d,(1035,476,1100,541),'#C58C67')
    poly(d,[(1007,542),(1125,542),(1162,730),(988,730)],'#496F7B')
    line(d,[(1040,550),(1092,550)],'#E9C58A',8)
    save(im,'shelter.png')

def ballot():
    im,d=canvas((183,215,229),(250,235,196))
    ellipse(d,(990,95,1120,225),'#EDC878')
    poly(d,[(0,540),(150,480),(300,538),(450,445),(620,530),(815,440),(990,520),(1200,465),(1200,800),(0,800)],'#91B3A4')
    rect(d,(140,394,1060,707),'#E9E5D4',18)
    rect(d,(205,370,995,420),'#D47956',12)
    rect(d,(515,260,685,400),'#DED8C6')
    poly(d,[(470,278),(600,198),(730,278)],'#C77756')
    rect(d,(550,250,650,273),'#799A86',5)
    for x in range(530,680,30): rect(d,(x,286,x+13,363),'#879D91',5)
    rect(d,(305,455,897,673),'#F8F5E8',14)
    for y in [498,550,602]:
        rect(d,(355,y,402,y+36),'#DDE8DB',8,outline='#6F9580',width=2)
        line(d,[(364,y+18),(377,y+29),(395,y+8)],'#387355',5)
        rect(d,(435,y+8,800,y+19),'#A7B4A2',5)
    line(d,[(0,735),(1200,680)],'#F5F0DE',12)
    save(im,'ballot.png')

def shade():
    im,d=canvas((171,211,222),(245,232,193))
    ellipse(d,(930,65,1095,230),'#F3C878')
    for x,w,h,c in [(0,185,295,'#829C93'),(175,180,395,'#638879'),(905,210,340,'#829C93'),(1070,180,270,'#97A99B')]:
        rect(d,(x,492-h,x+w,492),c)
        for wx in range(x+22,x+w-10,45):
            for wy in range(515-h,468,62): rect(d,(wx,wy,wx+18,wy+27),'#E2D6AF',4)
    poly(d,[(0,515),(1200,465),(1200,800),(0,800)],'#718A73')
    poly(d,[(0,622),(1200,585),(1200,800),(0,800)],'#D2C7A8')
    line(d,[(0,688),(1200,650)],'#EEE7D5',9)
    tree(d,325,520,295,'#2F7155','#765A42')
    tree(d,645,465,350,'#3E805C','#805E43')
    tree(d,920,535,260,'#638E61','#795A43')
    ellipse(d,(582,235,705,358),'#C9E9AE')
    line(d,[(622,299),(622,361)],'#E5EBC6',8)
    save(im,'shade.png')

for scene in (water, transit, farm, shelter, ballot, shade):
    scene()
print(f'Created six editorial demo illustrations in {OUT}')
