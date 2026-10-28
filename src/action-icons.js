// Icones SVG lleugeres per al botó d'acció. Sense renders ni textures
// addicionals: canvien només quan canvia el vehicle seleccionat.
window.HUNTER_ACTION_ICONS=(()=>{
  const ink='#1d2828',metal='#8b9fa1',steel='#c0cecf',glass='#a9dcec',
        olive='#7c956b',dark='#424c45',wood='#bd9064',foam='#d9e2d8';
  const svg=body=>'<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">'+body+'</svg>';
  const wheels=(a,b,y=46,r=6)=>'<g fill="'+ink+'" stroke="'+steel+'" stroke-width="1.5"><circle cx="'+a+'" cy="'+y+'" r="'+r+'"/><circle cx="'+b+'" cy="'+y+'" r="'+r+'"/></g><g fill="'+metal+'"><circle cx="'+a+'" cy="'+y+'" r="2"/><circle cx="'+b+'" cy="'+y+'" r="2"/></g>';
  const hull=(color=olive)=>'<path d="M4 37L57 37 50 50 14 50Z" fill="'+color+'" stroke="'+ink+'" stroke-width="2.5" stroke-linejoin="round"/>';
  const rotor=(color=olive)=>'<path d="M11 29Q18 22 36 22L43 30 36 37 16 37Z" fill="'+color+'" stroke="'+ink+'" stroke-width="2.4"/><path d="M38 28L57 33 55 37 38 35" fill="'+metal+'" stroke="'+ink+'" stroke-width="2"/><path d="M3 17H61M32 17V22" stroke="'+steel+'" stroke-width="3" stroke-linecap="round"/>';
  const boat=extra=>hull()+'<path d="M18 37L24 27H42L48 37Z" fill="'+steel+'" stroke="'+ink+'" stroke-width="2"/><path d="M26 29H39L43 35H23Z" fill="'+glass+'"/>'+extra;
  const forms={
    cotxe:svg('<path d="M8 41L13 31 23 27H43L54 35 57 42 55 47H8Z" fill="'+olive+'" stroke="'+ink+'" stroke-width="2.5"/><path d="M23 30H41L49 38H17Z" fill="'+glass+'"/>'+wheels(18,47)),
    // Familiar civil C1A: icona pròpia, no la motxilla per defecte.
    cotxe_civil:svg('<path d="M5 41L8 29L18 24H46L55 30L59 41L57 47H6Z" fill="'+olive+'" stroke="'+ink+'" stroke-width="2.5"/><path d="M19 27H45L51 35H12Z" fill="'+glass+'" stroke="'+ink+'" stroke-width="1.5"/><path d="M31 27V36M46 24V39" stroke="'+dark+'" stroke-width="2"/>'+wheels(17,48)),
    camio:svg('<path d="M4 31H35V45H4Z" fill="'+olive+'" stroke="'+ink+'" stroke-width="2.5"/><path d="M36 32H48L59 40V45H36Z" fill="'+metal+'" stroke="'+ink+'" stroke-width="2.5"/><path d="M39 34H47L53 39H39Z" fill="'+glass+'"/>'+wheels(15,49)),
    moto:svg('<path d="M14 42L28 31 39 35 47 42M27 31L40 31 48 28M30 30L25 25M33 30L36 43" fill="none" stroke="'+olive+'" stroke-width="5" stroke-linejoin="round"/><path d="M25 24H37M45 28H53" stroke="'+ink+'" stroke-width="3"/>'+wheels(15,49,45,8)),
    bici:svg('<path d="M15 44L26 31 36 44 15 44 31 27M26 31L42 31 49 44M29 27H36M42 31L45 25H51" fill="none" stroke="'+steel+'" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>'+wheels(15,49,44,8)),
    tanqueta:svg('<path d="M7 34L52 34 57 44 8 44Z" fill="'+olive+'" stroke="'+ink+'" stroke-width="2.5"/><path d="M19 34V28L30 24H42L48 34" fill="'+metal+'" stroke="'+ink+'" stroke-width="2"/><path d="M43 28L59 26" stroke="'+steel+'" stroke-width="3.5"/><rect x="6" y="41" width="50" height="10" rx="5" fill="'+ink+'"/><path d="M13 46H50" stroke="'+metal+'" stroke-width="3" stroke-dasharray="4 4"/>'),
    tanc:svg('<path d="M8 35H53L58 46H7Z" fill="'+olive+'" stroke="'+ink+'" stroke-width="2.6"/><path d="M17 34L23 25H43L48 35" fill="'+dark+'" stroke="'+ink+'" stroke-width="2.4"/><path d="M38 28H62" stroke="'+steel+'" stroke-width="4" stroke-linecap="round"/><rect x="6" y="42" width="51" height="12" rx="6" fill="'+ink+'" stroke="'+metal+'" stroke-width="2"/><circle cx="16" cy="48" r="3" fill="'+steel+'"/><circle cx="31" cy="48" r="3" fill="'+steel+'"/><circle cx="46" cy="48" r="3" fill="'+steel+'"/>'),
    heli:svg(rotor()+'<path d="M18 38H38M17 40L13 47H47L44 40M5 35L5 44H12" fill="none" stroke="'+steel+'" stroke-width="2.6"/><path d="M17 29H34L37 35H16Z" fill="'+glass+'" stroke="'+ink+'" stroke-width="1.3"/>'),
    heli_combat:svg(rotor(dark)+'<path d="M13 37L7 46H49L45 37" fill="none" stroke="'+steel+'" stroke-width="2.6"/><path d="M21 29H35L38 34H20Z" fill="'+glass+'"/><path d="M4 35L18 40H39L52 36" stroke="'+olive+'" stroke-width="4" stroke-linecap="round"/><path d="M16 41V48M46 40V47" stroke="'+steel+'" stroke-width="3"/>'),
    llanxa:svg(boat('<path d="M12 45H50" stroke="'+steel+'" stroke-width="2.5"/>')),
    llanxa_coets:svg(boat('<path d="M32 27V19H49L53 24 49 29 32 29" fill="'+dark+'" stroke="'+ink+'" stroke-width="2"/><path d="M36 22H50M36 26H50" stroke="'+steel+'" stroke-width="2"/>')),
    moto_aquatica:svg('<path d="M10 39H25L35 31H48L57 40 48 48H18L10 44Z" fill="'+olive+'" stroke="'+ink+'" stroke-width="2.4"/><path d="M31 31L28 24H44M39 25L43 32" stroke="'+steel+'" stroke-width="3" fill="none"/><path d="M5 52Q15 46 25 52T45 52T63 52" fill="none" stroke="'+glass+'" stroke-width="2.4"/>'),
    hover:svg('<path d="M8 29L17 24H45L55 29 59 42 53 47H11L5 42Z" fill="'+olive+'" stroke="'+ink+'" stroke-width="2.5"/><path d="M18 27H44L49 36H13Z" fill="'+glass+'"/><path d="M8 45Q31 38 56 45V51H8Z" fill="'+dark+'" stroke="'+ink+'" stroke-width="2"/><circle cx="50" cy="19" r="8" fill="none" stroke="'+steel+'" stroke-width="3"/><path d="M50 13V25M44 19H56" stroke="'+steel+'" stroke-width="1.5"/>'),
    ferry:svg('<path d="M3 39H61L51 51H13Z" fill="'+olive+'" stroke="'+ink+'" stroke-width="2.4"/><rect x="29" y="20" width="23" height="19" rx="1" fill="'+steel+'" stroke="'+ink+'" stroke-width="2"/><path d="M35 23V35M43 23V35M30 29H52" stroke="'+glass+'" stroke-width="4"/><path d="M4 36L17 33 26 39M42 17H51" fill="none" stroke="'+metal+'" stroke-width="3"/>'),
    barca_rems:svg('<path d="M8 38H56L48 48H17Z" fill="'+wood+'" stroke="'+ink+'" stroke-width="2.5"/><path d="M15 39Q31 46 49 39" stroke="'+dark+'" stroke-width="2" fill="none"/><path d="M22 34L10 24M41 34L53 24" stroke="'+wood+'" stroke-width="3.5" stroke-linecap="round"/><path d="M6 21L14 28M50 28L58 21" stroke="'+steel+'" stroke-width="4" stroke-linecap="round"/><path d="M28 34H39" stroke="'+ink+'" stroke-width="4"/>'),
    windsurf:svg('<path d="M7 49H57L52 52H14Z" fill="'+foam+'" stroke="'+ink+'" stroke-width="2"/><path d="M30 10L31 47H54Q37 27 30 10Z" fill="'+glass+'" stroke="'+ink+'" stroke-width="2.2"/><path d="M30 15V46M34 26L42 31" stroke="'+steel+'" stroke-width="2"/><path d="M11 55Q26 51 40 55T63 55" fill="none" stroke="'+glass+'" stroke-width="2.3"/>')
  };
  const backpack=svg('<path d="M20 21V14Q20 8 32 8Q44 8 44 14V21" fill="none" stroke="'+steel+'" stroke-width="4"/><path d="M17 19H47Q51 19 51 25V53Q51 57 47 57H17Q13 57 13 53V25Q13 19 17 19Z" fill="'+olive+'" stroke="'+ink+'" stroke-width="2.5"/><path d="M22 19V52M42 19V52" stroke="'+dark+'" stroke-width="3"/><rect x="20" y="32" width="24" height="17" rx="3" fill="'+wood+'" stroke="'+ink+'" stroke-width="2"/><path d="M29 32V38H35V32" fill="none" stroke="'+steel+'" stroke-width="2.5"/><path d="M13 28H9V48H13M51 28H55V48H51" fill="none" stroke="'+ink+'" stroke-width="3"/>');
  return Object.freeze({
    backpack,
    door:svg('<path d="M12 57V7H51V57M7 57H57" fill="none" stroke="'+steel+'" stroke-width="4"/><path d="M17 54V12L43 17V54Z" fill="'+wood+'" stroke="'+ink+'" stroke-width="2.5"/><circle cx="36" cy="36" r="2.8" fill="'+metal+'"/>'),
    vehicle:type=>forms[type]||backpack,
    types:Object.freeze(Object.keys(forms))
  });
})();
